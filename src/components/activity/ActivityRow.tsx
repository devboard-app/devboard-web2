import type { TicketStatus, User } from '@/types';
import type { ActivityEvent } from '@/api/reports';
import { Avatar } from '@/components/layout/AppShell';

const statusLabels: Record<TicketStatus, string> = {
  backlog: 'Backlog', todo: 'To do', in_progress: 'In progress', in_review: 'In review', done: 'Done',
};

export function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusLabel(value: string | null | undefined) {
  return statusLabels[value as TicketStatus] ?? value ?? '?';
}

interface ActivityText { verb: string; target: string; rest?: string; href?: string; detail?: string }

// The URL comes from a GitHub payload, so only ever link to https.
function safeHttpsUrl(url: string | undefined) {
  return url && url.startsWith('https://') ? url : undefined;
}

/** Turns a raw analytics event into "<actor> <verb> <target> <rest>". */
function describeEvent(e: ActivityEvent, nameOf: (id: string) => string): ActivityText {
  const m = e.metadata;
  const label = m.label_name ? `label ${m.label_name}` : 'a label';
  switch (e.action) {
    case 'ticket.created': return { verb: 'created', target: e.entity_key };
    case 'ticket.deleted': return { verb: 'deleted', target: e.entity_key };
    case 'ticket.updated':
      if (m.field === 'status') return { verb: 'moved', target: e.entity_key, rest: `to ${statusLabel(m.to)}` };
      if (m.field === 'story_points') return { verb: 'set story points of', target: e.entity_key, rest: m.to ? `to ${m.to}` : 'to none' };
      return { verb: `changed the ${m.field?.replace('_', ' ') ?? 'details'} of`, target: e.entity_key };
    case 'ticket.assigned': return { verb: 'assigned', target: e.entity_key, rest: m.assignee_id ? `to ${nameOf(m.assignee_id)}` : undefined };
    case 'ticket.unassigned': return { verb: 'unassigned', target: m.assignee_id ? nameOf(m.assignee_id) : 'someone', rest: `from ${e.entity_key}` };
    case 'ticket.sprint_added': return { verb: 'added', target: e.entity_key, rest: m.sprint_name ? `to ${m.sprint_name}` : 'to a sprint' };
    case 'ticket.sprint_removed': return { verb: 'removed', target: e.entity_key, rest: m.sprint_name ? `from ${m.sprint_name}` : 'from a sprint' };
    case 'ticket.epic_linked': return { verb: 'linked', target: e.entity_key, rest: m.epic_key ? `to epic ${m.epic_key}` : 'to an epic' };
    case 'ticket.epic_unlinked': return { verb: 'unlinked', target: e.entity_key, rest: m.epic_key ? `from epic ${m.epic_key}` : 'from an epic' };
    case 'ticket.commit_linked': return {
      verb: 'linked commit',
      target: m.commit_sha ? m.commit_sha.slice(0, 7) : 'a commit',
      rest: `to ${e.entity_key}`,
      href: safeHttpsUrl(m.commit_url),
      detail: [m.commit_message?.split('\n')[0], m.repo].filter(Boolean).join(' · ') || undefined,
    };
    case 'label.applied': return { verb: `added ${label} to`, target: e.entity_key };
    case 'label.removed': return { verb: `removed ${label} from`, target: e.entity_key };
    case 'comment.created': return { verb: 'commented on', target: e.entity_key };
    case 'comment.updated': return { verb: 'edited a comment on', target: e.entity_key };
    case 'comment.deleted': return { verb: 'deleted a comment on', target: e.entity_key };
    case 'sprint.started': return { verb: 'started sprint', target: e.entity_key };
    case 'sprint.completed': return { verb: 'completed sprint', target: e.entity_key };
    default: return { verb: e.action, target: e.entity_key };
  }
}

/** One line of the activity feed; shared by the Reports page and the ticket panel. */
export function ActivityRow({ event, userFor, className = 'px-5 py-3.5' }: {
  event: ActivityEvent;
  userFor: (id: string) => User;
  className?: string;
}) {
  const actor = userFor(event.actor);
  const text = describeEvent(event, id => userFor(id).username);

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <Avatar user={actor} size="xs" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{actor.username}</span>
          {' '}{text.verb}{' '}
          {text.href ? (
            <a href={text.href} target="_blank" rel="noopener noreferrer"
              className="font-mono font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{text.target}</a>
          ) : (
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{text.target}</span>
          )}
          {text.rest && <> {text.rest}</>}
        </p>
        {text.detail && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{text.detail}</p>}
        <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">{timeAgo(event.created_at)}</p>
      </div>
    </div>
  );
}
