import { apiGet, apiPost, apiDelete } from './client';
import type { Paginated } from './teams';
import type { ApiTicket } from './tickets';

export type ApiSprintStatus = 'created' | 'active' | 'completed';

export interface ApiSprint {
  id: string;
  name: string;
  goal: string;
  start_date: string | null;
  end_date: string | null;
  status: ApiSprintStatus;
  project: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// The list endpoint uses SprintListSerializer, which is only these fields —
// no goal, project, created_at etc. (those are on the detail/create responses).
export type ApiSprintSummary = Pick<ApiSprint, 'id' | 'name' | 'status' | 'start_date' | 'end_date'>;

const base = (teamId: string, projectId: string) => `/api/teams/${teamId}/projects/${projectId}`;

export const listSprints = (teamId: string, projectId: string) =>
  apiGet<Paginated<ApiSprintSummary>>(`${base(teamId, projectId)}/sprints/`, { limit: 100 });

export const createSprint = (teamId: string, projectId: string, name: string, goal?: string, start_date?: string, end_date?: string) =>
  apiPost<ApiSprint>(`${base(teamId, projectId)}/sprints/`, { name, goal, start_date, end_date });

export const startSprint = (teamId: string, projectId: string, sprintId: string) =>
  apiPost<ApiSprint>(`${base(teamId, projectId)}/sprints/${sprintId}/start/`);

export const completeSprint = (teamId: string, projectId: string, sprintId: string) =>
  apiPost<ApiSprint>(`${base(teamId, projectId)}/sprints/${sprintId}/complete/`);

export const listSprintTickets = (teamId: string, projectId: string, sprintId: string) =>
  apiGet<Paginated<ApiTicket>>(`${base(teamId, projectId)}/sprints/${sprintId}/tickets/`, { limit: 100 });

export const addTicketToSprint = (teamId: string, projectId: string, sprintId: string, ticketId: string) =>
  apiPost<ApiTicket>(`${base(teamId, projectId)}/sprints/${sprintId}/tickets/`, { ticket_id: ticketId });

export const removeTicketFromSprint = (teamId: string, projectId: string, sprintId: string, ticketId: string) =>
  apiDelete<void>(`${base(teamId, projectId)}/sprints/${sprintId}/tickets/${ticketId}/`);
