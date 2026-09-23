import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { Paginated } from './teams';

export interface ApiAttachmentRef {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  url: string;
}

export interface ApiComment {
  id: string;
  ticket: string;
  author_id: string;
  body: string;
  attachment_ids: string[];
  // Resolved server-side via devboard-attachments' internal batch endpoint;
  // silently [] per-id if that lookup fails, not an error condition.
  attachments: ApiAttachmentRef[];
  mentioned_user_ids: string[];
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

const base = (teamId: string, projectId: string, ticketId: string) =>
  `/api/teams/${teamId}/projects/${projectId}/tickets/${ticketId}/comments`;

export const listComments = (teamId: string, projectId: string, ticketId: string) =>
  apiGet<Paginated<ApiComment>>(`${base(teamId, projectId, ticketId)}/`, { limit: 100 });

// Max 5 attachment_ids per comment, each must already be a confirmed upload
// owned by the requester — enforced server-side (devboard-work/comments/services.py).
export const createComment = (teamId: string, projectId: string, ticketId: string, body: string, attachment_ids?: string[]) =>
  apiPost<ApiComment>(`${base(teamId, projectId, ticketId)}/`, { body, attachment_ids });

// Attachments can't be changed on edit — body only.
export const updateComment = (teamId: string, projectId: string, ticketId: string, commentId: string, body: string) =>
  apiPatch<ApiComment>(`${base(teamId, projectId, ticketId)}/${commentId}/`, { body });

export const deleteComment = (teamId: string, projectId: string, ticketId: string, commentId: string) =>
  apiDelete<void>(`${base(teamId, projectId, ticketId)}/${commentId}/`);
