import type { TicketType } from '@/types';

// Jira-style: a small filled square per type, white glyph inside. The epic glyph is
// the same diamond as EpicTag, so an epic card and its children's chips read as linked.
const TYPES: Record<TicketType, { label: string; bg: string; glyph: React.ReactNode }> = {
  epic: {
    label: 'Epic',
    bg: 'bg-violet-500',
    glyph: <path d="M5 1.5l3.5 3.5L5 8.5 1.5 5z" fill="currentColor" />,
  },
  bug: {
    label: 'Bug',
    bg: 'bg-red-500',
    glyph: <circle cx="5" cy="5" r="2.25" fill="currentColor" />,
  },
  feature: {
    label: 'Feature',
    bg: 'bg-emerald-500',
    glyph: <path d="M3 2h4v6L5 6.6 3 8z" fill="currentColor" />,
  },
  task: {
    label: 'Task',
    bg: 'bg-sky-500',
    glyph: <path d="M2.75 5.25l1.5 1.5 3-3.25" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  },
  improvement: {
    label: 'Improvement',
    bg: 'bg-amber-500',
    glyph: <path d="M5 8V2.5M2.75 4.5L5 2.25 7.25 4.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  },
};

export function TicketTypeIcon({ type }: { type: TicketType }) {
  const t = TYPES[type] ?? TYPES.task;
  return (
    <span title={t.label} role="img" aria-label={t.label}
      className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-[3px] text-white flex-shrink-0 ${t.bg}`}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">{t.glyph}</svg>
    </span>
  );
}
