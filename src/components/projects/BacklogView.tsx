import { useState } from 'react';
import type { EpicSummary, Ticket, Priority, TicketStatus, TicketType, Sprint } from '@/types';
import { Avatar } from '@/components/layout/AppShell';
import { EpicTag } from '@/components/tickets/EpicTag';

interface Props {
  tickets: Ticket[];
  epicById: Record<string, EpicSummary>;
  openSprints: Sprint[];
  onTicketClick: (id: string) => void;
  onCreateTicket: (title: string, type: TicketType) => void;
  onAddToSprint: (sprintId: string, ticketId: string) => void;
}

const ticketTypes: TicketType[] = ['task', 'bug', 'feature', 'improvement', 'epic'];

const priorityIcons: Record<Priority, { label: string; color: string }> = {
  critical: { label: '!!', color: 'text-red-600 dark:text-red-400' },
  high: { label: '!', color: 'text-orange-500 dark:text-orange-400' },
  medium: { label: '–', color: 'text-yellow-500 dark:text-yellow-400' },
  low: { label: '↓', color: 'text-zinc-400 dark:text-zinc-600' },
};

const statusColors: Record<TicketStatus, string> = {
  backlog: 'text-zinc-300 dark:text-zinc-700',
  todo: 'text-zinc-400',
  in_progress: 'text-blue-500',
  in_review: 'text-amber-500',
  done: 'text-emerald-500',
};

const statusLabels: Record<TicketStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

function StatusDot({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${statusColors[status]}`} title={statusLabels[status]}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        {status === 'backlog' && <circle cx="6" cy="6" r="4.5" strokeDasharray="2 2" stroke="currentColor" strokeWidth="1.3" />}
        {status === 'todo' && <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />}
        {status === 'in_progress' && <><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" /><path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></>}
        {status === 'in_review' && <><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" /><path d="M4 6l1.5 1.5L8 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></>}
        {status === 'done' && <><circle cx="6" cy="6" r="4.5" fill="currentColor" fillOpacity="0.2" /><path d="M3.5 6l1.5 1.5L8.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></>}
      </svg>
    </span>
  );
}

export function BacklogView({ tickets, epicById, openSprints, onTicketClick, onCreateTicket, onAddToSprint }: Props) {
  const [filter, setFilter] = useState<'all' | 'unassigned'>('all');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<TicketType>('task');

  const backlogTickets = tickets.filter(t => {
    const matchesFilter = filter === 'all' || (filter === 'unassigned' && !t.assignee);
    const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.key.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  function submitCreate() {
    if (!newTitle.trim()) return;
    onCreateTicket(newTitle.trim(), newType);
    setNewTitle('');
    setNewType('task');
    setCreating(false);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
          {(['all', 'unassigned'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}>
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1 relative">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
            <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />
            <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets…"
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-transparent border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
          />
        </div>

        {creating ? (
          <div className="flex items-center gap-1.5">
            <input autoFocus type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="Ticket title…"
              onKeyDown={e => { if (e.key === 'Enter') submitCreate(); if (e.key === 'Escape') setCreating(false); }}
              className="w-48 px-2.5 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <select value={newType} onChange={e => setNewType(e.target.value as TicketType)}
              className="text-xs px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none capitalize">
              {ticketTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={submitCreate} disabled={!newTitle.trim()}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
              Create
            </button>
            <button onClick={() => setCreating(false)} aria-label="Cancel new ticket" className="px-1.5 py-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            New ticket
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {/* Column headers */}
        <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
          <span className="text-[11px] font-semibold text-zinc-400 w-16">KEY</span>
          <span className="text-[11px] font-semibold text-zinc-400">TITLE</span>
          <span className="text-[11px] font-semibold text-zinc-400 w-24">STATUS</span>
          <span className="text-[11px] font-semibold text-zinc-400 w-20">PRIORITY</span>
          <span className="text-[11px] font-semibold text-zinc-400 w-20">ASSIGNEE</span>
          <span className="text-[11px] font-semibold text-zinc-400 w-12">PTS</span>
          <span className="text-[11px] font-semibold text-zinc-400 w-28">SPRINT</span>
        </div>

        {backlogTickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-zinc-400">
                <path d="M3 5h14M3 10h14M3 15h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No tickets match</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">Try a different filter or search term</p>
          </div>
        )}

        {backlogTickets.map(ticket => (
          <div key={ticket.id}
            className="w-full text-left md:grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors group">

            <button onClick={() => onTicketClick(ticket.id)} className="contents text-left">
              {/* Mobile layout */}
              <div className="md:hidden flex items-start gap-3">
                <StatusDot status={ticket.status} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">{ticket.key}</span>
                    {ticket.parentEpicId && epicById[ticket.parentEpicId] && <EpicTag epic={epicById[ticket.parentEpicId]} />}
                    {ticket.labels.slice(0, 2).map(l => (
                      <span key={l.id} className="px-1.5 py-0 rounded text-[10px] font-medium" style={{ backgroundColor: l.color + '20', color: l.color }}>{l.name}</span>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">{ticket.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs font-semibold ${priorityIcons[ticket.priority].color}`}>{priorityIcons[ticket.priority].label}</span>
                    {ticket.assignee && <Avatar user={ticket.assignee} size="xs" />}
                  </div>
                </div>
              </div>

              {/* Desktop layout */}
              <span className="hidden md:block text-[11px] font-mono text-zinc-400 dark:text-zinc-500 w-16">{ticket.key}</span>
              <div className="hidden md:flex items-center gap-2 flex-1 min-w-0">
                <p className="text-sm text-zinc-800 dark:text-zinc-200 truncate group-hover:text-zinc-900 dark:group-hover:text-zinc-100">{ticket.title}</p>
                {ticket.parentEpicId && epicById[ticket.parentEpicId] && <EpicTag epic={epicById[ticket.parentEpicId]} />}
                {ticket.labels.slice(0, 2).map(l => (
                  <span key={l.id} className="px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: l.color + '20', color: l.color }}>{l.name}</span>
                ))}
              </div>
              <div className="hidden md:flex items-center gap-1.5 w-24">
                <StatusDot status={ticket.status} />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{statusLabels[ticket.status]}</span>
              </div>
              <span className={`hidden md:block text-xs font-semibold w-20 capitalize ${priorityIcons[ticket.priority].color}`}>
                {ticket.priority}
              </span>
              <div className="hidden md:flex items-center gap-1.5 w-20">
                {ticket.assignee ? (
                  <>
                    <Avatar user={ticket.assignee} size="xs" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{ticket.assignee.username}</span>
                  </>
                ) : (
                  <span className="text-xs text-zinc-300 dark:text-zinc-700">—</span>
                )}
              </div>
              <span className="hidden md:block text-xs text-zinc-400 dark:text-zinc-600 w-12">
                {ticket.storyPoints ? `${ticket.storyPoints}` : '—'}
              </span>
            </button>

            <div className="hidden md:block w-28" onClick={e => e.stopPropagation()}>
              {openSprints.length > 0 ? (
                <select defaultValue="" onChange={e => { if (e.target.value) { onAddToSprint(e.target.value, ticket.id); e.target.value = ''; } }}
                  className="w-full text-xs px-1.5 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <option value="">+ Sprint</option>
                  {openSprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <span className="text-xs text-zinc-300 dark:text-zinc-700">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
