import { useState } from 'react';
import type { EpicSummary, Sprint, Ticket, SprintStatus } from '@/types';
import { EpicTag } from '@/components/tickets/EpicTag';

interface Props {
  sprints: Sprint[];
  sprintTickets: Record<string, Ticket[]>;
  epicById: Record<string, EpicSummary>;
  onCreateSprint: (name: string, startDate?: string, endDate?: string) => void;
  onStartSprint: (sprintId: string) => void;
  onCompleteSprint: (sprintId: string) => void;
  onRemoveFromSprint: (sprintId: string, ticketId: string) => void;
  onTicketClick: (id: string) => void;
}

const statusConfig: Record<SprintStatus, { label: string; color: string; bg: string }> = {
  created: { label: 'Created', color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  active: { label: 'Active', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950' },
  completed: { label: 'Completed', color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950' },
};

function SprintProgress({ tickets }: { tickets: Ticket[] }) {
  const done = tickets.filter(t => t.status === 'done').length;
  const total = tickets.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">{done}/{total}</span>
    </div>
  );
}

export function SprintsView({ sprints, sprintTickets, epicById, onCreateSprint, onStartSprint, onCompleteSprint, onRemoveFromSprint, onTicketClick }: Props) {
  const [expanded, setExpanded] = useState<string | null>(sprints.find(s => s.status === 'active')?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  // Optional, but the burndown report can't be built for a sprint without both.
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const datesInvalid = newStart !== '' && newEnd !== '' && newEnd < newStart;

  function handleCreate() {
    if (!newSprintName.trim() || datesInvalid) return;
    onCreateSprint(newSprintName.trim(), newStart || undefined, newEnd || undefined);
    setNewSprintName('');
    setNewStart('');
    setNewEnd('');
    setCreating(false);
  }

  const ordered = [
    ...sprints.filter(s => s.status === 'active'),
    ...sprints.filter(s => s.status === 'created'),
    ...sprints.filter(s => s.status === 'completed'),
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-5 py-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Sprints</h2>
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            New sprint
          </button>
        </div>

        {/* Create sprint */}
        {creating && (
          <div className="mb-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">New sprint</p>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text" value={newSprintName} onChange={e => setNewSprintName(e.target.value)}
                placeholder="Sprint name…"
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
              />
              <button onClick={handleCreate} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">Create</button>
              <button onClick={() => setCreating(false)} aria-label="Cancel new sprint" className="px-2 py-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs text-zinc-500 dark:text-zinc-400">Start</label>
              <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)}
                className="px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <label className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">End</label>
              <input type="date" value={newEnd} min={newStart || undefined} onChange={e => setNewEnd(e.target.value)}
                className="px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {datesInvalid && <span className="text-xs text-red-600 dark:text-red-400">End is before start</span>}
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5">Dates are optional, but the burndown report needs both.</p>
          </div>
        )}

        {/* Sprint list */}
        <div className="space-y-3">
          {ordered.map(sprint => {
            const tickets = sprintTickets[sprint.id] ?? [];
            const isOpen = expanded === sprint.id;
            const cfg = statusConfig[sprint.status];
            const canStart = sprint.status === 'created' && tickets.length > 0;

            return (
              <div key={sprint.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {/* Sprint header */}
                <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  {/* Expand toggle — clickable zone */}
                  <div role="button" tabIndex={0}
                    onClick={() => setExpanded(isOpen ? null : sprint.id)}
                    onKeyDown={e => e.key === 'Enter' && setExpanded(isOpen ? null : sprint.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                      className={`text-zinc-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}>
                      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{sprint.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      {(sprint.startDate || sprint.endDate) && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          {sprint.startDate} {sprint.endDate ? `→ ${sprint.endDate}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  {tickets.length > 0 && (
                    <div className="w-32 hidden sm:block flex-shrink-0">
                      <SprintProgress tickets={tickets} />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sprint.status === 'created' && (
                      <button onClick={() => onStartSprint(sprint.id)} disabled={!canStart}
                        title={canStart ? undefined : 'A sprint needs at least one ticket before it can start'}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors">
                        Start
                      </button>
                    )}
                    {sprint.status === 'active' && (
                      <button onClick={() => onCompleteSprint(sprint.id)}
                        className="px-2.5 py-1 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-900 dark:hover:bg-zinc-600 text-white text-xs font-medium rounded-lg transition-colors">
                        Complete
                      </button>
                    )}
                  </div>
                </div>

                {/* Sprint goal */}
                {isOpen && sprint.goal && (
                  <div className="px-4 pb-3 pt-0">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2 italic">
                      Goal: {sprint.goal}
                    </p>
                  </div>
                )}

                {/* Ticket list */}
                {isOpen && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800">
                    {tickets.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-zinc-500 dark:text-zinc-500">No tickets in this sprint</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">Add tickets to this sprint from the Backlog view</p>
                      </div>
                    ) : (
                      tickets.map((ticket, i) => (
                        <div key={ticket.id}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group ${
                            i < tickets.length - 1 ? 'border-b border-zinc-50 dark:border-zinc-800/50' : ''
                          }`}>
                          <button onClick={() => onTicketClick(ticket.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                            {/* Status dot */}
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              ticket.status === 'done' ? 'bg-emerald-500' :
                              ticket.status === 'in_progress' ? 'bg-blue-500' :
                              ticket.status === 'in_review' ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'
                            }`} />
                            <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 flex-shrink-0 w-14">{ticket.key}</span>
                            <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200 truncate">{ticket.title}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {ticket.parentEpicId && epicById[ticket.parentEpicId] && <span className="hidden sm:inline"><EpicTag epic={epicById[ticket.parentEpicId]} /></span>}
                              {ticket.labels.slice(0, 1).map(l => (
                                <span key={l.id} className="px-1.5 py-0.5 rounded text-[10px] font-medium hidden sm:inline" style={{ backgroundColor: l.color + '20', color: l.color }}>{l.name}</span>
                              ))}
                              {ticket.storyPoints && <span className="text-[11px] text-zinc-400 dark:text-zinc-600">{ticket.storyPoints}pt</span>}
                            </div>
                          </button>
                          <button onClick={() => onRemoveFromSprint(sprint.id, ticket.id)}
                            title="Remove from sprint" aria-label={`Remove ${ticket.title} from sprint`}
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-2 rounded text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-all flex-shrink-0">
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {sprints.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-zinc-400">
                  <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No sprints yet</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1 mb-4">Create a sprint to start planning</p>
              <button onClick={() => setCreating(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                Create first sprint
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
