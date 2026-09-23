import { useState } from 'react';
import { askProjectChat } from '@/api/chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export function useChat(projectId: string, projectName?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    setError(null);
    setMessages(prev => [...prev, { role: 'user', text }]);
    setSending(true);
    try {
      const res = await askProjectChat(projectId, text, projectName);
      setMessages(prev => [...prev, { role: 'assistant', text: res.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
    }
  }

  return { messages, send, sending, error };
}
