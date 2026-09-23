import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Ticket, Sprint, TicketStatus, User } from '@/types';
import {
  getBoard, listBacklog, createTicket as apiCreateTicket, updateTicket as apiUpdateTicket,
  type ApiTicket, type ApiTicketListItem, type CreateTicketInput, type UpdateTicketInput,
} from '@/api/tickets';
import {
  listSprints, listSprintTickets, createSprint as apiCreateSprint, startSprint as apiStartSprint,
  completeSprint as apiCompleteSprint, addTicketToSprint as apiAddTicketToSprint,
  removeTicketFromSprint as apiRemoveTicketFromSprint, type ApiSprint,
} from '@/api/sprints';
import { colorFor, initialsFor } from '@/lib/avatar';

function toUser(userId: string, membersById: Record<string, User>): User {
  return membersById[userId] ?? { id: userId, username: userId, initials: initialsFor(userId), color: colorFor(userId) };
}

function toTicket(api: ApiTicketListItem | ApiTicket, membersById: Record<string, User>): Ticket {
  const full = api as Partial<ApiTicket>;
  return {
    id: api.id,
    key: api.key,
    title: api.title,
    description: full.description ?? '',
    type: api.type,
    status: api.status,
    priority: api.priority,
    assignee: api.assignee_id ? toUser(api.assignee_id, membersById) : undefined,
    labels: api.labels,
    comments: [],
    createdAt: full.created_at ?? '',
    updatedAt: full.updated_at ?? '',
    storyPoints: api.story_points ?? undefined,
    dueDate: api.due_date ?? undefined,
  };
}

function toSprint(api: Pick<ApiSprint, 'id' | 'name' | 'status' | 'start_date' | 'end_date'> & Partial<ApiSprint>): Sprint {
  return {
    id: api.id,
    name: api.name,
    status: api.status,
    startDate: api.start_date ?? undefined,
    endDate: api.end_date ?? undefined,
    goal: api.goal || undefined,
  };
}

const EMPTY_COLUMNS: Record<TicketStatus, Ticket[]> = { backlog: [], todo: [], in_progress: [], in_review: [], done: [] };

export function useProjectData(teamId: string, projectId: string, projectMembers: User[]) {
  const membersById = useMemo(() => Object.fromEntries(projectMembers.map(m => [m.id, m])), [projectMembers]);

  const [board, setBoard] = useState<{ sprint: Sprint | null; columns: Record<TicketStatus, Ticket[]> }>({ sprint: null, columns: EMPTY_COLUMNS });
  const [backlogTickets, setBacklogTickets] = useState<Ticket[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintTickets, setSprintTickets] = useState<Record<string, Ticket[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [boardRes, backlogRes, sprintsRes] = await Promise.all([
          getBoard(teamId, projectId),
          listBacklog(teamId, projectId),
          listSprints(teamId, projectId),
        ]);

        const columns: Record<TicketStatus, Ticket[]> = { ...EMPTY_COLUMNS };
        for (const [status, tickets] of Object.entries(boardRes.board)) {
          columns[status as TicketStatus] = (tickets ?? []).map(t => toTicket(t, membersById));
        }

        const sprintList = sprintsRes.results.map(toSprint);
        const ticketsPerSprint = await Promise.all(
          sprintList.map(async (s) => {
            const page = await listSprintTickets(teamId, projectId, s.id);
            return [s.id, page.results.map(t => toTicket(t, membersById))] as const;
          })
        );

        if (cancelled) return;
        setBoard({ sprint: boardRes.sprint ? toSprint(boardRes.sprint) : null, columns });
        setBacklogTickets(backlogRes.results.map(t => toTicket(t, membersById)));
        setSprints(sprintList);
        setSprintTickets(Object.fromEntries(ticketsPerSprint));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load project data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [teamId, projectId, membersById, reloadToken]);

  const refetch = useCallback(() => setReloadToken(t => t + 1), []);

  async function createTicket(input: CreateTicketInput) {
    await apiCreateTicket(teamId, projectId, input);
    refetch();
  }

  async function updateTicketStatus(ticketId: string, status: TicketStatus) {
    await apiUpdateTicket(teamId, projectId, ticketId, { status });
    refetch();
  }

  async function updateTicketFields(ticketId: string, patch: UpdateTicketInput) {
    await apiUpdateTicket(teamId, projectId, ticketId, patch);
    refetch();
  }

  async function createSprint(name: string, goal?: string, start_date?: string, end_date?: string) {
    await apiCreateSprint(teamId, projectId, name, goal, start_date, end_date);
    refetch();
  }

  async function startSprint(sprintId: string) {
    await apiStartSprint(teamId, projectId, sprintId);
    refetch();
  }

  async function completeSprint(sprintId: string) {
    await apiCompleteSprint(teamId, projectId, sprintId);
    refetch();
  }

  async function addTicketToSprint(sprintId: string, ticketId: string) {
    await apiAddTicketToSprint(teamId, projectId, sprintId, ticketId);
    refetch();
  }

  async function removeTicketFromSprint(sprintId: string, ticketId: string) {
    await apiRemoveTicketFromSprint(teamId, projectId, sprintId, ticketId);
    refetch();
  }

  return {
    board, backlogTickets, sprints, sprintTickets, loading, error,
    createTicket, updateTicketStatus, updateTicketFields,
    createSprint, startSprint, completeSprint, addTicketToSprint, removeTicketFromSprint,
    // Exposed so label apply/remove (a separate endpoint, not part of the
    // ticket PATCH — see src/api/labels.ts) can refresh each ticket's
    // server-resolved `labels` array after a mutation.
    refetch,
  };
}
