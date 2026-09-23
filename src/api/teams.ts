import { apiGet, apiPost, apiPatch, apiDelete } from './client';

export interface Paginated<T> {
  count: number;
  limit: number;
  offset: number;
  results: T[];
}

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

// devboard-work's Team has no `status`/`avatar` field — just this.
export interface ApiTeam {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
}

export interface TeamMembership {
  id: string;
  team: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
}

export const listTeams = () => apiGet<Paginated<ApiTeam>>('/api/teams/', { limit: 100 });

export const createTeam = (name: string, description?: string) =>
  apiPost<ApiTeam>('/api/teams/', { name, description });

export const getTeamDetail = (teamId: string) => apiGet<ApiTeam>(`/api/teams/${teamId}/`);

export const listTeamMembers = (teamId: string) =>
  apiGet<Paginated<TeamMembership>>(`/api/teams/${teamId}/members/`, { limit: 100 });

// Add-by-email, not by user_id — matches devboard-work's TeamMemberInputSerializer.
export const addTeamMember = (teamId: string, email: string, role: TeamRole) =>
  apiPost<TeamMembership>(`/api/teams/${teamId}/members/`, { email, role });

export const updateTeamMemberRole = (teamId: string, userId: string, role: TeamRole) =>
  apiPatch<TeamMembership>(`/api/teams/${teamId}/members/${userId}/`, { role });

export const removeTeamMember = (teamId: string, userId: string) =>
  apiDelete<void>(`/api/teams/${teamId}/members/${userId}/`);

export const leaveTeam = (teamId: string) => apiDelete<void>(`/api/teams/${teamId}/members/me/`);
