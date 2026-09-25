import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { Paginated } from './teams';

// devboard-work's Project has no `lead`/`status` field — lead is derived
// from ProjectMembership.role === 'lead', not stored on the project itself.
export interface ApiProject {
  id: string;
  name: string;
  key: string;
  description: string;
  avatar: string; // public image URL, '' when unset
  banner: string;
  team: string;
  created_by: string;
  created_at: string;
}

export type ProjectRole = 'lead' | 'contributor';

export interface ProjectMembership {
  id: string;
  project: string;
  user_id: string;
  role: ProjectRole;
  joined_at: string;
}

// Lead only server-side. Partial: send just the fields that change.
export const updateProject = (teamId: string, projectId: string, patch: { avatar?: string; banner?: string }) =>
  apiPatch<ApiProject>(`/api/teams/${teamId}/projects/${projectId}/`, patch);

export const listProjects = (teamId: string) =>
  apiGet<Paginated<ApiProject>>(`/api/teams/${teamId}/projects/`, { limit: 100 });

// `key` is required and client-supplied (^[A-Z0-9]{2,10}$) — not auto-generated
// server-side, unlike prd.md's description. The creator is auto-assigned
// ProjectMembership.Role.LEAD server-side; there's no `lead` field to send.
export const createProject = (teamId: string, name: string, key: string, description?: string) =>
  apiPost<ApiProject>(`/api/teams/${teamId}/projects/`, { name, key, description });

// Writes are lead-only server-side (403 otherwise). The target must already be on the team (403),
// and adding someone twice is a 409. The only lead can't be demoted or removed (403).
export const addProjectMember = (teamId: string, projectId: string, userId: string, role: ProjectRole) =>
  apiPost<ProjectMembership>(`/api/teams/${teamId}/projects/${projectId}/members/`, { user_id: userId, role });

export const updateProjectMemberRole = (teamId: string, projectId: string, userId: string, role: ProjectRole) =>
  apiPatch<ProjectMembership>(`/api/teams/${teamId}/projects/${projectId}/members/${userId}/`, { role });

export const removeProjectMember = (teamId: string, projectId: string, userId: string) =>
  apiDelete<void>(`/api/teams/${teamId}/projects/${projectId}/members/${userId}/`);

export const listProjectMembers = (teamId: string, projectId: string) =>
  apiGet<Paginated<ProjectMembership>>(`/api/teams/${teamId}/projects/${projectId}/members/`, { limit: 100 });
