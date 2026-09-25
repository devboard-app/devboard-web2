import { useMemo, useRef, useState, type KeyboardEvent, type TextareaHTMLAttributes } from 'react';
import type { User } from '@/types';
import { Avatar } from '@/components/layout/AppShell';

// Mirrors devboard-work/comments/mentions.py MENTION_RE: an `@` not preceded
// by a word char or `/`. Here we match the partial token ending at the caret.
const ACTIVE_MENTION_RE = /(?:^|[^\w/])@([a-zA-Z0-9_.-]{0,30})$/;
const MAX_SUGGESTIONS = 6;

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  members: User[];
};

export function MentionTextarea({ value, onChange, members, onKeyDown, onBlur, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // `start` is the index of the `@`; null means the picker is closed.
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [active, setActive] = useState(0);

  const suggestions = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    const starts = members.filter(m => m.username.toLowerCase().startsWith(q));
    const contains = members.filter(m => !m.username.toLowerCase().startsWith(q) && m.username.toLowerCase().includes(q));
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [mention, members]);

  const open = mention !== null && suggestions.length > 0;

  function detect(text: string, caret: number) {
    const m = ACTIVE_MENTION_RE.exec(text.slice(0, caret));
    if (!m) { setMention(null); return; }
    setMention({ start: caret - m[1].length - 1, query: m[1] });
    setActive(0);
  }

  function pick(user: User) {
    if (!mention) return;
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const after = value.slice(caret);
    const insert = `@${user.username}${after.startsWith(' ') ? '' : ' '}`;
    const next = value.slice(0, mention.start) + insert + after;
    const nextCaret = mention.start + insert.length;
    onChange(next);
    setMention(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % suggestions.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i - 1 + suggestions.length) % suggestions.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(suggestions[active]); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setMention(null); return; }
    }
    onKeyDown?.(e);
  }

  return (
    <div className="relative">
      <textarea
        {...rest}
        ref={ref}
        value={value}
        onChange={e => { onChange(e.target.value); detect(e.target.value, e.target.selectionStart); }}
        onKeyDown={handleKeyDown}
        onClick={e => detect(e.currentTarget.value, e.currentTarget.selectionStart)}
        onBlur={e => { setMention(null); onBlur?.(e); }}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? 'mention-listbox' : undefined}
        aria-activedescendant={open ? `mention-opt-${suggestions[active]?.id}` : undefined}
      />
      {open && (
        <ul id="mention-listbox" role="listbox"
          className="absolute left-0 top-full mt-1 z-50 w-64 max-w-full py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((m, i) => (
            <li key={m.id} id={`mention-opt-${m.id}`} role="option" aria-selected={i === active}
              // mousedown (not click) so the textarea's blur doesn't close the list first
              onMouseDown={e => { e.preventDefault(); pick(m); }}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ${i === active ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
              <Avatar user={m} size="xs" />
              <span className="truncate">{m.username}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Renders a comment body with @mentions of known members highlighted.
const MENTION_RE = /(?<![\w/])@([a-zA-Z0-9][a-zA-Z0-9_.-]{1,28}[a-zA-Z0-9])/g;

export function CommentBody({ body, members }: { body: string; members: User[] }) {
  const known = useMemo(() => new Set(members.map(m => m.username.toLowerCase())), [members]);
  const parts: (string | { name: string })[] = [];
  let last = 0;
  for (const m of body.matchAll(MENTION_RE)) {
    if (!known.has(m[1].toLowerCase())) continue;
    parts.push(body.slice(last, m.index), { name: m[1] });
    last = m.index! + m[0].length;
  }
  parts.push(body.slice(last));
  return (
    <>
      {parts.map((p, i) => typeof p === 'string'
        ? p
        : <span key={i} className="px-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium">@{p.name}</span>)}
    </>
  );
}
