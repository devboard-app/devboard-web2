import { useSyncExternalStore } from 'react';
import { askProjectChat } from '@/api/chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface ChatState {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
}

// Conversations live outside the component, one per project, so closing the chat
// panel (which unmounts it) or switching tabs doesn't lose them — and an answer
// that arrives after the panel closed still lands. Mirrored to sessionStorage so a
// reload keeps them too; cleared on logout (see clearAllChats).
const STORAGE_PREFIX = 'devboard:chat:';
const MAX_STORED_MESSAGES = 50;

const chats = new Map<string, ChatState>();
const listeners = new Set<() => void>();

function load(projectId: string): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + projectId);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function getChat(projectId: string): ChatState {
  let chat = chats.get(projectId);
  if (!chat) {
    chat = { messages: load(projectId), sending: false, error: null };
    chats.set(projectId, chat);
  }
  return chat;
}

function updateChat(projectId: string, update: (prev: ChatState) => Partial<ChatState>) {
  const prev = getChat(projectId);
  const next = { ...prev, ...update(prev) };
  chats.set(projectId, next);
  if (next.messages !== prev.messages) {
    try {
      sessionStorage.setItem(STORAGE_PREFIX + projectId, JSON.stringify(next.messages.slice(-MAX_STORED_MESSAGES)));
    } catch {
      // Storage full or blocked: the in-memory copy still works for this page load.
    }
  }
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Drops every stored conversation, so the next user in this tab doesn't see them. */
export function clearAllChats() {
  chats.clear();
  try {
    Object.keys(sessionStorage).filter(k => k.startsWith(STORAGE_PREFIX)).forEach(k => sessionStorage.removeItem(k));
  } catch {
    // Nothing stored.
  }
  listeners.forEach(l => l());
}

export function useChat(projectId: string, projectName?: string) {
  const { messages, sending, error } = useSyncExternalStore(subscribe, () => getChat(projectId));

  async function send(text: string) {
    updateChat(projectId, prev => ({ error: null, sending: true, messages: [...prev.messages, { role: 'user', text }] }));
    try {
      const res = await askProjectChat(projectId, text, projectName);
      updateChat(projectId, prev => ({ messages: [...prev.messages, { role: 'assistant', text: res.answer }] }));
    } catch (err) {
      updateChat(projectId, () => ({ error: err instanceof Error ? err.message : 'Something went wrong' }));
    } finally {
      updateChat(projectId, () => ({ sending: false }));
    }
  }

  function clear() {
    updateChat(projectId, () => ({ messages: [], error: null }));
  }

  return { messages, send, sending, error, clear };
}
