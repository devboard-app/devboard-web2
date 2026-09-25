import type { ReactNode } from 'react';
import type { User } from '@/types';
import type { ActivityEvent } from '@/api/reports';
import { Skeleton } from '@/components/ui/Skeleton';
import { describeEvent } from './ActivityRow';

const svg = (children: ReactNode) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ICONS = {
  flag: svg(<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></>),
  check: svg(<polyline points="20 6 9 17 4 12" />),
  commit: svg(<><circle cx="12" cy="12" r="4" /><line x1="1.05" y1="12" x2="7" y2="12" /><line x1="17.01" y1="12" x2="22.96" y2="12" /></>),
  plus: svg(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>),
  trash: svg(<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /></>),
  arrow: svg(<><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>),
  pencil: svg(<><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></>),
  user: svg(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  message: svg(<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />),
  tag: svg(<><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>),
};

const TONES = {
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  zinc: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  github: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
};

/** Icon and colour that tell the reader what kind of event a row is at a glance. */
function eventVisual(e: ActivityEvent): { icon: ReactNode; tone: string } {
  switch (e.action) {
    case 'sprint.started': return { icon: ICONS.flag, tone: TONES.indigo };
    case 'sprint.completed': return { icon: ICONS.check, tone: TONES.emerald };
    case 'ticket.sprint_added':
    case 'ticket.sprint_removed': return { icon: ICONS.flag, tone: TONES.indigo };
    case 'ticket.commit_linked': return { icon: ICONS.commit, tone: TONES.github };
    case 'ticket.created': return { icon: ICONS.plus, tone: TONES.sky };
    case 'ticket.deleted': return { icon: ICONS.trash, tone: TONES.red };
    case 'ticket.updated':
      return e.metadata.field === 'status'
        ? { icon: ICONS.arrow, tone: TONES.amber }
        : { icon: ICONS.pencil, tone: TONES.zinc };
    case 'ticket.assigned':
    case 'ticket.unassigned': return { icon: ICONS.user, tone: TONES.violet };
    case 'comment.created':
    case 'comment.updated':
    case 'comment.deleted': return { icon: ICONS.message, tone: TONES.sky };
    case 'label.applied':
    case 'label.removed':
    case 'ticket.epic_linked':
    case 'ticket.epic_unlinked': return { icon: ICONS.tag, tone: TONES.amber };
    default: return { icon: ICONS.pencil, tone: TONES.zinc };
  }
}

interface DayGroup { key: string; date: Date; items: ActivityEvent[] }

// Events arrive newest first, so consecutive events on the same local day form one group.
function groupByDay(events: ActivityEvent[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const e of events) {
    const date = new Date(e.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(e);
    else groups.push({ key, date, items: [e] });
  }
  return groups;
}

function dayHeading(date: Date) {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function ActivityItem({ event, userFor }: { event: ActivityEvent; userFor: (id: string) => User }) {
  const actor = userFor(event.actor);
  const text = describeEvent(event, id => userFor(id).username);
  const { icon, tone } = eventVisual(event);
  const created = new Date(event.created_at);

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tone}`}>{icon}</span>

      <div className="flex-1 min-w-0 pt-1">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{actor.username}</span>
          {' '}{text.verb}{' '}
          {text.href ? (
            <a href={text.href} target="_blank" rel="noopener noreferrer"
              className="font-mono font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{text.target}</a>
          ) : (
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{text.target}</span>
          )}
          {text.rest && <> {text.rest}</>}
        </p>
        {text.detail && (
          <p className="mt-1.5 inline-block max-w-full truncate rounded-lg bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1 text-xs text-zinc-500 dark:text-zinc-400">
            {text.detail}
          </p>
        )}
      </div>

      <time dateTime={event.created_at} title={created.toLocaleString()}
        className="flex-shrink-0 pt-1.5 text-xs tabular-nums whitespace-nowrap text-zinc-400 dark:text-zinc-500">
        {created.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </time>
    </li>
  );
}

/** Project activity grouped by day, one card per day. The ticket panel keeps the compact ActivityRow list. */
export function ActivityTimeline({ events, userFor }: { events: ActivityEvent[]; userFor: (id: string) => User }) {
  return (
    <div className="space-y-6">
      {groupByDay(events).map(group => (
        <section key={group.key} aria-label={dayHeading(group.date)}>
          <div className="mb-2 flex items-baseline gap-2 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {dayHeading(group.date)}
            </h3>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {group.items.length} {group.items.length === 1 ? 'event' : 'events'}
            </span>
          </div>
          <ol className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
            {group.items.map((e, i) => <ActivityItem key={e._id ?? `${group.key}-${i}`} event={e} userFor={userFor} />)}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** Same shape as ActivityTimeline (day heading + card of rows) so the page doesn't jump when data arrives. */
export function ActivityTimelineSkeleton() {
  return (
    <div className="space-y-6">
      {[5, 3].map((rows, group) => (
        <section key={group}>
          <Skeleton className="mb-2 ml-1 h-3 w-24" />
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0 pt-1.5">
                  <Skeleton className="h-3.5 w-3/5" />
                </div>
                <Skeleton className="mt-1.5 h-3 w-12 flex-shrink-0" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
