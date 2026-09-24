import { useState } from 'react';
import type { Project, Team } from '@/types';
import type { ProjectRole } from '@/api/projects';
import { ApiError } from '@/api/client';
import { Avatar } from '@/components/layout/AppShell';

interface Props {
  team: Team;
  project: Project;
  currentUserId: string;
  onAdd: (userId: string, role: ProjectRole) => Promise<void>;
  onChangeRole: (userId: string, role: ProjectRole) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
  onGoToTeam: () => void;
}

const roleLabels: Record<ProjectRole, string> = { lead: 'Lead', contributor: 'Contributor' };

const selectCls = 'px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60';

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.detail;
  return err instanceof Error ? err.message : fallback;
}

export function MembersPage({ team, project, currentUserId, onAdd, onChangeRole, onRemove, onGoToTeam }: Props) {
  // Only leads can manage members (the backend returns 403 for anyone else).
  const isLead = project.leadIds.includes(currentUserId);
  const roleOf = (userId: string): ProjectRole => (project.leadIds.includes(userId) ? 'lead' : 'contributor');

  // Project membership requires being on the team first, so the picker only offers those people.
  const candidates = team.members.filter(m => !project.members.some(pm => pm.id === m.id));

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<ProjectRole>('contributor');

  async function run(id: string, action: () => Promise<void>, fallback: string) {
    setBusyId(id);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err, fallback));
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdd() {
    const userId = newUserId || candidates[0]?.id;
    if (!userId) return;
    await run('add', async () => { await onAdd(userId, newRole); setNewUserId(''); setNewRole('contributor'); }, 'Could not add the member.');
  }

  const ordered = [...project.members].sort((a, b) => Number(roleOf(b.id) === 'lead') - Number(roleOf(a.id) === 'lead') || a.username.localeCompare(b.username));

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-5 py-8">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Members</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Who can work in {project.name}. Leads manage the project; contributors can only edit tickets assigned to them.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400">{error}</div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 mb-4">
          {ordered.map(member => {
            const role = roleOf(member.id);
            const busy = busyId === member.id;
            return (
              <div key={member.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar user={member} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {member.username}
                    {member.id === currentUserId && <span className="ml-1.5 text-xs font-normal text-zinc-400 dark:text-zinc-500">(you)</span>}
                  </p>
                </div>
                {isLead ? (
                  <>
                    <select value={role} disabled={busy} aria-label={`Role of ${member.username}`} className={selectCls}
                      onChange={e => void run(member.id, () => onChangeRole(member.id, e.target.value as ProjectRole), 'Could not change the role.')}>
                      {(Object.keys(roleLabels) as ProjectRole[]).map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
                    </select>
                    <button disabled={busy} aria-label={`Remove ${member.username}`}
                      onClick={() => void run(member.id, () => onRemove(member.id), 'Could not remove the member.')}
                      className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors disabled:opacity-60">
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </button>
                  </>
                ) : (
                  <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{roleLabels[role]}</span>
                )}
              </div>
            );
          })}
        </div>

        {isLead ? (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-3">Add a member</p>
            {candidates.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Everyone on {team.name} is already in this project.{' '}
                <button onClick={onGoToTeam} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  Invite more people to the team
                </button>.
              </p>
            ) : (
              <div className="flex gap-2">
                <select value={newUserId || candidates[0].id} onChange={e => setNewUserId(e.target.value)} aria-label="Team member to add"
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {candidates.map(c => <option key={c.id} value={c.id}>{c.username}</option>)}
                </select>
                <select value={newRole} onChange={e => setNewRole(e.target.value as ProjectRole)} aria-label="Role for the new member" className={selectCls}>
                  {(Object.keys(roleLabels) as ProjectRole[]).map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
                </select>
                <button onClick={() => void handleAdd()} disabled={busyId === 'add'}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                  {busyId === 'add' ? 'Adding…' : 'Add'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Only project leads can add or change members.</p>
        )}
      </div>
    </div>
  );
}
