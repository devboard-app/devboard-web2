import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { Paginated } from './teams';

export type ApiTicketType = 'epic' | 'bug' | 'feature' | 'task' | 'improvement';
export type ApiPriority = 'low' | 'medium' | 'high' | 'critical';
export type ApiTicketStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
export const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;

export interface ApiLabel {
  id: string;
  name: string;
  color: string;
}

// GET .../tickets/ (list) — lighter than the detail shape, no description/project/created_by.
export interface ApiTicketListItem {
  id: string;
  key: string;
  title: string;
  type: ApiTicketType;
  priority: ApiPriority;
  status: ApiTicketStatus;
  story_points: number | null;
  assignee_id: string | null;
  due_date: string | null;
  labels: ApiLabel[];
}

// GET .../tickets/{id}/, board, backlog, sprint-tickets all return this full shape.
export interface ApiTicket extends ApiTicketListItem {
  ticket_number: number;
  description: string;
  project: string;
  created_by: string;
  parent_epic: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketFilters {
  assignee?: string;
  priority?: ApiPriority;
  type?: ApiTicketType;
  label?: string;
  parent_epic?: string;
}

export interface BoardResponse {
  sprint: { id: string; name: string; status: 'created' | 'active' | 'completed'; start_date: string | null; end_date: string | null } | null;
  board: Partial<Record<ApiTicketStatus, ApiTicket[]>>;
}

const base = (teamId: string, projectId: string) => `/api/teams/${teamId}/projects/${projectId}`;

export const listTickets = (teamId: string, projectId: string, filters: TicketFilters = {}) =>
  apiGet<Paginated<ApiTicketListItem>>(`${base(teamId, projectId)}/tickets/`, { ...filters, limit: 100 });

export const getBoard = (teamId: string, projectId: string) =>
  apiGet<BoardResponse>(`${base(teamId, projectId)}/board/`);

export const listBacklog = (teamId: string, projectId: string, filters: TicketFilters = {}) =>
  apiGet<Paginated<ApiTicket>>(`${base(teamId, projectId)}/backlog/`, { ...filters, limit: 100 });

export const getTicket = (teamId: string, projectId: string, ticketId: string) =>
  apiGet<ApiTicket>(`${base(teamId, projectId)}/tickets/${ticketId}/`);

export interface CreateTicketInput {
  title: string;
  type: ApiTicketType;
  description?: string;
  priority?: ApiPriority;
  status?: ApiTicketStatus;
  assignee_id?: string;
  parent_epic?: string;
  story_points?: number;
  due_date?: string;
}

// PATCH-only: `assignee_id`/`parent_epic` can be explicitly nulled to unassign/unlink,
// which CreateTicketInput's `string | undefined` can't express (undefined means
// "don't touch this field" everywhere else in this API layer).
export type UpdateTicketInput = Partial<Omit<CreateTicketInput, 'assignee_id' | 'parent_epic'>> & { assignee_id?: string | null; parent_epic?: string | null };

export const createTicket = (teamId: string, projectId: string, input: CreateTicketInput) =>
  apiPost<ApiTicket>(`${base(teamId, projectId)}/tickets/`, input);

export const updateTicket = (teamId: string, projectId: string, ticketId: string, patch: UpdateTicketInput) =>
  apiPatch<ApiTicket>(`${base(teamId, projectId)}/tickets/${ticketId}/`, patch);

export const deleteTicket = (teamId: string, projectId: string, ticketId: string) =>
  apiDelete<void>(`${base(teamId, projectId)}/tickets/${ticketId}/`);
