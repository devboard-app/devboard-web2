import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Team, User } from '@/types';
import {
  listTeams, createTeam as apiCreateTeam, listTeamMembers, addTeamMember,
  updateTeamMemberRole, removeTeamMember as apiRemoveTeamMember, leaveTeam as apiLeaveTeam, updateTeam as apiUpdateTeam,
  type ApiTeam, type TeamMembership, type TeamRole,
} from '@/api/teams';
import {
  listProjects, createProject as apiCreateProject, listProjectMembers,
  addProjectMember as apiAddProjectMember, updateProjectMemberRole as apiUpdateProjectMemberRole,
  removeProjectMember as apiRemoveProjectMember, updateProject as apiUpdateProject,
  type ApiProject, type ProjectMembership, type ProjectRole,
} from '@/api/projects';
import { batchUsers, type UserLookup } from '@/api/users';
import { colorFor, initialsFor } from '@/lib/avatar';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'team';
}

function toUser(userId: string, lookup: Record<string, UserLookup>): User {
  const username = lookup[userId]?.username ?? userId;
  return { id: userId, username, avatar: lookup[userId]?.avatar || undefined, initials: initialsFor(username), color: colorFor(username) };
}

interface RawTeamData {
  team: ApiTeam;
  members: TeamMembership[];
  projects: ApiProject[];
  projectMembers: Record<string, ProjectMembership[]>;
}

export function useTeamsData(authed: boolean) {
  const [rawTeams, setRawTeams] = useState<RawTeamData[]>([]);
  const [usersById, setUsersById] = useState<Record<string, UserLookup>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const teamsPage = await listTeams();
        const teamDatas = await Promise.all(teamsPage.results.map(async (team): Promise<RawTeamData> => {
          const [membersPage, projectsPage] = await Promise.all([
            listTeamMembers(team.id),
            listProjects(team.id),
          ]);
          const projectMemberEntries = await Promise.all(
            projectsPage.results.map(async (p) => [p.id, (await listProjectMembers(team.id, p.id)).results] as const)
          );
          return {
            team,
            members: membersPage.results,
            projects: projectsPage.results,
            projectMembers: Object.fromEntries(projectMemberEntries),
          };
        }));

        const allIds = new Set<string>();
        for (const td of teamDatas) {
          for (const m of td.members) allIds.add(m.user_id);
          for (const pm of Object.values(td.projectMembers)) for (const m of pm) allIds.add(m.user_id);
        }
        const resolved = await batchUsers([...allIds]);

        if (cancelled) return;
        setRawTeams(teamDatas);
        setUsersById(prev => ({ ...prev, ...Object.fromEntries(resolved.map(u => [u.user_id, u])) }));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load teams');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authed, reloadToken]);

  // Memoized: consumers (useProjectData) key their own effects off this
  // array's identity, and it's cheap to recompute only when the underlying
  // fetched data actually changes rather than on every render.
  const teams: Team[] = useMemo(() => rawTeams.map(({ team, members, projects, projectMembers }) => ({
    id: team.id,
    name: team.name,
    slug: slugify(team.name),
    avatarColor: colorFor(team.name),
    avatar: team.avatar || undefined,
    banner: team.banner || undefined,
    members: members.map(m => ({ ...toUser(m.user_id, usersById), role: m.role, joinedAt: m.joined_at })),
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      key: p.key,
      description: p.description,
      avatar: p.avatar || undefined,
      banner: p.banner || undefined,
      // Not wired here — tickets/sprints load per-project via
      // useProjectData; labels load per-project via useProjectLabels.
      tickets: [],
      sprints: [],
      members: (projectMembers[p.id] ?? []).map(pm => toUser(pm.user_id, usersById)),
      leadIds: (projectMembers[p.id] ?? []).filter(pm => pm.role === 'lead').map(pm => pm.user_id),
    })),
  })), [rawTeams, usersById]);

  // Deliberately blunt: re-pull everything after any mutation instead of
  // patching local state. Simple and correct; fine at the team/project
  // counts a dev tool like this actually has.
  const refetch = useCallback(() => setReloadToken(t => t + 1), []);

  async function createTeam(name: string, description?: string) {
    await apiCreateTeam(name, description);
    refetch();
  }

  async function createProject(teamId: string, name: string, key: string, description?: string) {
    await apiCreateProject(teamId, name, key, description);
    refetch();
  }

  async function addProjectMember(teamId: string, projectId: string, userId: string, role: ProjectRole) {
    await apiAddProjectMember(teamId, projectId, userId, role);
    refetch();
  }

  async function changeProjectMemberRole(teamId: string, projectId: string, userId: string, role: ProjectRole) {
    await apiUpdateProjectMemberRole(teamId, projectId, userId, role);
    refetch();
  }

  async function removeProjectMember(teamId: string, projectId: string, userId: string) {
    await apiRemoveProjectMember(teamId, projectId, userId);
    refetch();
  }

  async function inviteMember(teamId: string, email: string, role: TeamRole) {
    await addTeamMember(teamId, email, role);
    refetch();
  }

  async function changeMemberRole(teamId: string, userId: string, role: TeamRole) {
    await updateTeamMemberRole(teamId, userId, role);
    refetch();
  }

  async function removeMember(teamId: string, userId: string) {
    await apiRemoveTeamMember(teamId, userId);
    refetch();
  }

  async function updateTeamImages(teamId: string, patch: { avatar?: string; banner?: string }) {
    await apiUpdateTeam(teamId, patch);
    refetch();
  }

  async function updateProjectImages(teamId: string, projectId: string, patch: { avatar?: string; banner?: string }) {
    await apiUpdateProject(teamId, projectId, patch);
    refetch();
  }

  async function leaveTeamById(teamId: string) {
    await apiLeaveTeam(teamId);
    refetch();
  }

  return {
    teams, loading, error,
    createTeam, createProject, addProjectMember, changeProjectMemberRole, removeProjectMember, inviteMember, changeMemberRole, removeMember,
    leaveTeam: leaveTeamById, updateTeamImages, updateProjectImages,
  };
}
