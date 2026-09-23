import { apiGet, apiPost, apiPatch } from './client';

export interface CoreUser {
  user_id: string;
  email: string;
  username: string;
  avatar: string;
  timezone: string;
  role: string;
  status: string;
  last_active: string;
  created_at: string;
  updated_at: string;
}

// What /api/users/batch/ returns per id — no email, see BACKEND_GAPS.md.
export interface UserLookup {
  user_id: string;
  username: string;
  avatar: string;
}

export const getMe = () => apiGet<CoreUser>('/api/users/me/');

// Only these two are editable; username, email and role are read-only server-side.
// `timezone` is free text there, so callers should send a real IANA name.
export const updateMe = (patch: { avatar?: string; timezone?: string }) =>
  apiPatch<CoreUser>('/api/users/me/', patch);

export function batchUsers(ids: string[]): Promise<UserLookup[]> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return Promise.resolve([]);
  return apiPost<UserLookup[]>('/api/users/batch/', { ids: uniqueIds });
}
