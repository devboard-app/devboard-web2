import { apiGet, apiPatch, apiDelete } from './client';
import type { Paginated } from './teams';

// Matches devboard-integrations' Notification.to_dict().
export interface ApiNotification {
  id: string;
  type: 'mention' | 'assignment' | 'comment' | 'status_change';
  message: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

// Newest first, server-side. No `read` filter or unread-count endpoint exists —
// see BACKEND_GAPS.md #7.
export const listNotifications = (limit = 100, offset = 0) =>
  apiGet<Paginated<ApiNotification>>('/api/notifications/', { limit, offset });

export const markNotificationRead = (id: string) =>
  apiPatch<ApiNotification>(`/api/notifications/${id}/`);

export const markAllNotificationsRead = () =>
  apiPatch<{ message: string }>('/api/notifications/read-all/');

export const deleteNotification = (id: string) =>
  apiDelete<void>(`/api/notifications/${id}/`);
