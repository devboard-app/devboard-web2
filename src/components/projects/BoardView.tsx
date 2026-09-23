import { useState } from 'react';
import type { Ticket, TicketStatus, TicketType } from '@/types';
import { Avatar } from '@/components/layout/AppShell';

interface Props {
  columns: Record<TicketStatus, Ticket[]>;
  onTicketClick: (id: string) => void;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
  onCreateTicket: (status: TicketStatus, title: string, type: TicketType) => void;
}

const columnDefs: { status: TicketStatus; label: string; accent: string }[] = [
  { status: 'backlog', label: 'Backlog', accent: 'bg-zinc-300 dark:bg-zinc-600' },
  { status: 'todo', label: 'Todo', accent: 'bg-zinc-400' },
  { status: 'in_progress', label: 'In Progress', accent: 'bg-blue-500' },
  { status: 'in_review', label: 'In Review', accent: 'bg-amber-500' },
  { status: 'done', label: 'Done', accent: 'bg-emerald-500' },
];

const ticketTypes: TicketType[] = ['task', 'bug', 'feature', 'improvement', 'epic'];

const priorityDot: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-zinc-300 dark:bg-zinc-600',
};

function TicketCard({ ticket, onClick, onDragStart }: { ticket: Ticket; onClick: () => void; onDragStart: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all group select-none">
      {/* Key + priority */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">{ticket.key}</span>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityDot[ticket.priority]}`} title={ticket.priority} />
      </div>

      {/* Title */}
      <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-snug mb-2.5 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors line-clamp-3">
        {ticket.title}
      </p>

      {/* Labels */}
      {ticket.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {ticket.labels.slice(0, 3).map(label => (
            <span key={label.id}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ backgroundColor: label.color + '20', color: label.color }}>
              {label.name}
            </span>
          ))}
          {ticket.labels.length > 3 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              +{ticket.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {ticket.comments.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-600">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1.5h9v6.5H7L5.5 10 4 8H1V1.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" /></svg>
              {ticket.comments.length}
            </span>
          )}
          {ticket.storyPoints && (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-600">{ticket.storyPoints}pt</span>
          )}
        </div>
        {ticket.assignee && (
          <Avatar user={ticket.assignee} size="xs" />
        )}
      </div>
    </div>
  );
}

export function BoardView({ columns, onTicketClick, onStatusChange, onCreateTicket }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TicketStatus | null>(null);
  const [newTicketCol, setNewTicketCol] = useState<TicketStatus | null>(null);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketType, setNewTicketType] = useState<TicketType>('task');

  function handleDrop(status: TicketStatus) {
    if (dragging) {
      onStatusChange(dragging, status);
      setDragging(null);
      setDragOver(null);
    }
  }

  function submitNewTicket(status: TicketStatus) {
    if (!newTicketTitle.trim()) return;
    onCreateTicket(status, newTicketTitle.trim(), newTicketType);
    setNewTicketCol(null);
    setNewTicketTitle('');
    setNewTicketType('task');
  }

  return (
    <div className="h-full overflow-x-auto overflow-y-hidden">
      {/* Mobile: stacked columns */}
      <div className="flex gap-3 h-full p-4 min-w-max md:min-w-0 md:w-full">
        {columnDefs.map(col => {
          const colTickets = columns[col.status] ?? [];
          const isDragTarget = dragOver === col.status;
          return (
            <div key={col.status}
              className={`flex flex-col w-[280px] md:flex-1 flex-shrink-0 rounded-xl transition-colors ${
                isDragTarget ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : 'bg-zinc-100/60 dark:bg-zinc-900/40'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(col.status); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(col.status)}>

              {/* Column header */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.accent}`} />
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{col.label}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-600 ml-auto">{colTickets.length}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                {colTickets.length === 0 && !isDragTarget && (
                  <div className="py-8 text-center">
                    <p className="text-xs text-zinc-400 dark:text-zinc-600">No tickets</p>
                  </div>
                )}
                {isDragTarget && (
                  <div className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg h-16 flex items-center justify-center">
                    <p className="text-xs text-indigo-400 dark:text-indigo-600">Drop here</p>
                  </div>
                )}
                {colTickets.map(ticket => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onClick={() => onTicketClick(ticket.id)}
                    onDragStart={() => setDragging(ticket.id)}
                  />
                ))}

                {/* Add card form */}
                {newTicketCol === col.status ? (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5">
                    <textarea
                      autoFocus
                      value={newTicketTitle}
                      onChange={e => setNewTicketTitle(e.target.value)}
                      placeholder="Ticket title…"
                      rows={3}
                      className="w-full text-sm text-zinc-800 dark:text-zinc-200 bg-transparent resize-none focus:outline-none placeholder-zinc-400"
                      onKeyDown={e => {
                        if (e.key === 'Escape') { setNewTicketCol(null); setNewTicketTitle(''); }
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitNewTicket(col.status); }
                      }}
                    />
                    <select value={newTicketType} onChange={e => setNewTicketType(e.target.value as TicketType)}
                      className="mt-1 w-full text-xs px-1.5 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none capitalize">
                      {ticketTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => { setNewTicketCol(null); setNewTicketTitle(''); }}
                        className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">Cancel</button>
                      <button onClick={() => submitNewTicket(col.status)} disabled={!newTicketTitle.trim()}
                        className="ml-auto px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
                        Create
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setNewTicketCol(col.status)}
                    className="w-full flex items-center gap-1.5 py-1.5 px-2 text-xs text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    Add ticket
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
