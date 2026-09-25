import { useEffect, useState } from 'react';
import type { Project, TabType, TicketStatus, TicketType } from '@/types';
import { useProjectData } from '@/hooks/useProjectData';
import { useProjectLabels } from '@/hooks/useProjectLabels';
import { useProjectEpics } from '@/hooks/useProjectEpics';
import { addTicketLabel, removeTicketLabel } from '@/api/labels';
import { ProjectTopBar } from './ProjectTopBar';
import { BoardView } from './BoardView';
import { BacklogView } from './BacklogView';
import { SprintsView } from './SprintsView';
import { TicketPanel } from '@/components/tickets/TicketPanel';
import { ErrorState } from '@/components/ui/LoadingState';
import { BoardSkeleton } from '@/components/ui/BoardSkeleton';
import { ListSkeleton } from '@/components/ui/ListSkeleton';

interface Props {
  teamName: string;
  onGoToTeam: () => void;
  teamId: string;
  project: Project;
  currentUserId: string;
  tab: TabType;
  /** Set when the URL is a ticket deep link (e.g. from a notification). */
  deepLinkTicketId?: string;
  onTabChange: (tab: TabType) => void;
  /** Drops the ticket id from the URL once the deep-linked panel is closed. */
  onCloseDeepLink: () => void;
  /** Swaps the URL's tab without touching the ticket id — used to correct a deep link that opened on the wrong tab. */
  onCorrectDeepLinkTab: (tab: TabType) => void;
  onOpenReports: () => void;
  onOpenSettings: () => void;
  /** Settings → Labels directly (Settings itself opens on General). */
  onOpenLabels: () => void;
}

export function ProjectPage({ teamName, onGoToTeam, teamId, project, currentUserId, tab, deepLinkTicketId, onTabChange, onCloseDeepLink, onCorrectDeepLinkTab, onOpenReports, onOpenSettings, onOpenLabels }: Props) {
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

  // A deep link (e.g. from a notification) always opens on the Board tab, since the URL
  // alone doesn't say where the ticket actually lives. Once the real data loads, correct
  // the tab so closing the panel doesn't strand the user on a tab that doesn't have it.
  useEffect(() => {
    if (!deepLinkTicketId || loading) return;
    const onBoard = Object.values(board.columns).some(list => list.some(t => t.id === deepLinkTicketId));
    const onBacklog = backlogTickets.some(t => t.id === deepLinkTicketId);
    const onSprint = Object.values(sprintTickets).some(list => list.some(t => t.id === deepLinkTicketId));
    const homeTab: TabType = onBoard ? 'board' : onBacklog ? 'backlog' : onSprint ? 'sprints' : tab;
    if (homeTab !== tab) onCorrectDeepLinkTab(homeTab);
    // Only re-derive when the underlying data or the ticket being linked to changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkTicketId, loading, board, backlogTickets, sprintTickets]);

  const { labels: projectLabels, createLabel } = useProjectLabels(teamId, project.id);
  const { epics: projectEpics, refetch: refetchEpics } = useProjectEpics(teamId, project.id);
  const epicById = Object.fromEntries(projectEpics.map(e => [e.id, e]));

  const allLoadedTickets = [...Object.values(board.columns).flat(), ...backlogTickets, ...Object.values(sprintTickets).flat()];
  const activeTicket = activeTicketId ? allLoadedTickets.find(t => t.id === activeTicketId) : null;

  const openSprints = sprints.filter(s => s.status !== 'completed');

  // Mirrors devboard-work: leads manage everything, contributors edit their own tickets.
  const isLead = project.leadIds.includes(currentUserId);
  const canEditTicket = (t: { assignee?: { id: string } }) => isLead || t.assignee?.id === currentUserId;

  const initialLoad = loading && allLoadedTickets.length === 0;

  if (error) {
    return <ErrorState message={error} onRetry={refetchTickets} />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <ProjectTopBar
        teamName={teamName}
        onGoToTeam={onGoToTeam}
        project={project}
        sprintLabel={board.sprint?.name}
        activeTab={tab}
        onTabChange={onTabChange}
        onOpenReports={onOpenReports}
        onOpenSettings={onOpenSettings}
      />

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {initialLoad ? (
          tab === 'board' ? <BoardSkeleton /> : <div className="h-full overflow-y-auto p-4"><ListSkeleton rows={6} /></div>
        ) : (
        <>
        {tab === 'board' && (
          <BoardView
            columns={board.columns}
            epicById={epicById}
            onTicketClick={setActiveTicketId}
            onStatusChange={(ticketId, status: TicketStatus) => void updateTicketStatus(ticketId, status)}
            onCreateTicket={(status, title, type: TicketType) => void createTicket({ title, type, status }, board.sprint?.id).then(() => type === 'epic' && refetchEpics())}
            isLead={isLead}
            canEditTicket={canEditTicket}
          />
        )}
        {tab === 'backlog' && (
          <BacklogView
            tickets={backlogTickets}
            epicById={epicById}
            openSprints={openSprints}
            onTicketClick={setActiveTicketId}
            onCreateTicket={(title, type) => void createTicket({ title, type }).then(() => type === 'epic' && refetchEpics())}
            onAddToSprint={(sprintId, ticketId) => void addTicketToSprint(sprintId, ticketId)}
            isLead={isLead}
          />
        )}
        {tab === 'sprints' && (
          <SprintsView
            sprints={sprints}
            sprintTickets={sprintTickets}
            epicById={epicById}
            onCreateSprint={(name, start, end) => void createSprint(name, undefined, start, end)}
            onStartSprint={(id) => void startSprint(id)}
            onCompleteSprint={(id) => void completeSprint(id)}
            onRemoveFromSprint={(sprintId, ticketId) => void removeTicketFromSprint(sprintId, ticketId)}
            onTicketClick={setActiveTicketId}
            isLead={isLead}
          />
        )}
        </>
        )}
      </div>

      {/* Ticket detail panel */}
      {activeTicket && (
        <TicketPanel
          teamId={teamId}
          projectId={project.id}
          ticket={activeTicket}
          projectMembers={project.members}
          projectLabels={projectLabels}
          onCreateProjectLabel={createLabel}
          projectEpics={projectEpics}
          onOpenTicket={setActiveTicketId}
          inSprint={!backlogTickets.some(t => t.id === activeTicket.id)}
          onClose={() => { setActiveTicketId(null); if (deepLinkTicketId) onCloseDeepLink(); }}
          onCommit={(patch) => void updateTicketFields(activeTicket.id, patch)}
          onAddLabel={(labelId) => addTicketLabel(teamId, project.id, activeTicket.id, labelId).then(refetchTickets)}
          onRemoveLabel={(labelId) => removeTicketLabel(teamId, project.id, activeTicket.id, labelId).then(refetchTickets)}
          onManageLabels={() => { setActiveTicketId(null); onOpenLabels(); }}
          currentUserId={currentUserId}
          isLead={isLead}
        />
      )}
    </div>
  );
}
