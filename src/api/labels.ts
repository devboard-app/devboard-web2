import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { Paginated } from './teams';

export interface ApiLabel {
  id: string;
  name: string;
  color: string;
  project: string;
  created_at: string;
}

const projectBase = (teamId: string, projectId: string) => `/api/teams/${teamId}/projects/${projectId}/labels`;

export const listProjectLabels = (teamId: string, projectId: string) =>
  apiGet<Paginated<ApiLabel>>(`${projectBase(teamId, projectId)}/`, { limit: 100 });

// Create/update/delete all require project role LEAD — a CONTRIBUTOR gets a
// 403 back, surfaced to the caller as an ApiError.
export const createProjectLabel = (teamId: string, projectId: string, name: string, color?: string) =>
  apiPost<ApiLabel>(`${projectBase(teamId, projectId)}/`, { name, color });

export const updateProjectLabel = (teamId: string, projectId: string, labelId: string, patch: { name?: string; color?: string }) =>
  apiPatch<ApiLabel>(`${projectBase(teamId, projectId)}/${labelId}/`, patch);

export const deleteProjectLabel = (teamId: string, projectId: string, labelId: string) =>
  apiDelete<void>(`${projectBase(teamId, projectId)}/${labelId}/`);

const ticketBase = (teamId: string, projectId: string, ticketId: string) =>
  `/api/teams/${teamId}/projects/${projectId}/tickets/${ticketId}/labels`;

// Labels are never written through the ticket PATCH body — TicketSerializer
// exposes `labels` read-only. Applying/removing is its own endpoint, gated
// by the same can_edit_ticket() check as editing the ticket itself.
export const addTicketLabel = (teamId: string, projectId: string, ticketId: string, labelId: string) =>
  apiPost<void>(`${ticketBase(teamId, projectId, ticketId)}/`, { label_id: labelId });

export const removeTicketLabel = (teamId: string, projectId: string, ticketId: string, labelId: string) =>
  apiDelete<void>(`${ticketBase(teamId, projectId, ticketId)}/${labelId}/`);
