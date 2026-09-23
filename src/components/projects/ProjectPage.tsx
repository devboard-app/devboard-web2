import { useEffect, useState } from 'react';
import type { Project, TabType, TicketStatus, TicketType } from '@/types';
import { useProjectData } from '@/hooks/useProjectData';
import { useProjectLabels } from '@/hooks/useProjectLabels';
import { addTicketLabel, removeTicketLabel } from '@/api/labels';
import { BoardView } from './BoardView';
import { BacklogView } from './BacklogView';
import { SprintsView } from './SprintsView';
import { TicketPanel } from '@/components/tickets/TicketPanel';

interface Props {
  teamId: string;
  project: Project;
  currentUserId: string;
  tab: TabType;
  /** Set when the URL is a ticket deep link (e.g. from a notification). */
  deepLinkTicketId?: string;
  onTabChange: (tab: TabType) => void;
  /** Drops the ticket id from the URL once the deep-linked panel is closed. */
  onCloseDeepLink: () => void;
}

export function ProjectPage({ teamId, project, currentUserId, tab, deepLinkTicketId, onTabChange, onCloseDeepLink }: Props) {
  const [activeTicketId, setActiveTicketId] = useState<string | null>(deepLinkTicketId ?? null);

  useEffect(() => {
    if (deepLinkTicketId) setActiveTicketId(deepLinkTicketId);
  }, [deepLinkTicketId]);

  const {
    board, backlogTickets, sprints, sprintTickets, loading, error,
    createTicket, updateTicketStatus, updateTicketFields,
    createSprint, startSprint, completeSprint, addTicketToSprint, removeTicketFromSprint,
    refetch: refetchTickets,
  } = useProjectData(teamId, project.id, project.members);

  const { labels: projectLabels, createLabel } = useProjectLabels(teamId, project.id);

  const allLoadedTickets = [...Object.values(board.columns).flat(), ...backlogTickets, ...Object.values(sprintTickets).flat()];
  const activeTicket = activeTicketId ? allLoadedTickets.find(t => t.id === activeTicketId) : null;

  const openSprints = sprints.filter(s => s.status !== 'completed');

  if (loading && allLoadedTickets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Project header */}
      <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-5 pt-4 pb-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">{project.key[0]}</span>
          </div>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{project.name}</h1>
          {board.sprint && (
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium rounded-full border border-emerald-200 dark:border-emerald-900">
              {board.sprint.name} active
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 -mb-px">
          {([
            { id: 'board', label: 'Board' },
            { id: 'backlog', label: 'Backlog' },
            { id: 'sprints', label: 'Sprints' },
          ] as { id: TabType; label: string }[]).map(t => (
            <button key={t.id} onClick={() => onTabChange(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-200 dark:hover:border-zinc-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'board' && (
          <BoardView
            columns={board.columns}
            onTicketClick={setActiveTicketId}
            onStatusChange={(ticketId, status: TicketStatus) => void updateTicketStatus(ticketId, status)}
            onCreateTicket={(status, title, type: TicketType) => void createTicket({ title, type, status })}
          />
        )}
        {tab === 'backlog' && (
          <BacklogView
            tickets={backlogTickets}
            openSprints={openSprints}
            onTicketClick={setActiveTicketId}
            onCreateTicket={(title, type) => void createTicket({ title, type })}
            onAddToSprint={(sprintId, ticketId) => void addTicketToSprint(sprintId, ticketId)}
          />
        )}
        {tab === 'sprints' && (
          <SprintsView
            sprints={sprints}
            sprintTickets={sprintTickets}
            onCreateSprint={(name, start, end) => void createSprint(name, undefined, start, end)}
            onStartSprint={(id) => void startSprint(id)}
            onCompleteSprint={(id) => void completeSprint(id)}
            onRemoveFromSprint={(sprintId, ticketId) => void removeTicketFromSprint(sprintId, ticketId)}
            onTicketClick={setActiveTicketId}
          />
        )}
      </div>

      {/* Ticket detail panel */}
      {activeTicket && (
        <TicketPanel
          teamId={teamId}
          projectId={project.id}
          ticket={activeTicket}
          projectMembers={project.members}
          isLead={project.leadIds.includes(currentUserId)}
          projectLabels={projectLabels}
          onCreateProjectLabel={createLabel}
          onClose={() => { setActiveTicketId(null); if (deepLinkTicketId) onCloseDeepLink(); }}
          onCommit={(patch) => void updateTicketFields(activeTicket.id, patch)}
          onAddLabel={(labelId) => addTicketLabel(teamId, project.id, activeTicket.id, labelId).then(refetchTickets)}
          onRemoveLabel={(labelId) => removeTicketLabel(teamId, project.id, activeTicket.id, labelId).then(refetchTickets)}
        />
      )}
    </div>
  );
}
