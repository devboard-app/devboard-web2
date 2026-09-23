import { useState } from 'react';
import type { Team, UserRole } from '@/types';
import { Avatar } from '@/components/layout/AppShell';

interface Props {
  team: Team;
  currentUserId: string;
  onInvite: (email: string, role: UserRole) => Promise<void>;
  onRoleChange: (userId: string, role: UserRole) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
  onLeave: () => Promise<void>;
}

const roleColors: Record<UserRole, string> = {
  owner: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  admin: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400',
  member: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  viewer: 'bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500',
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${roleColors[role]}`}>
      {role}
    </span>
  );
}

export function TeamPage({ team, currentUserId, onInvite, onRoleChange, onRemove, onLeave }: Props) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const members = team.members;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteLoading(true);
    try {
      await onInvite(inviteEmail, inviteRole);
      setInviteEmail('');
      setShowInvite(false);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Could not send invite.');
    } finally {
      setInviteLoading(false);
    }
  }

  function handleLeave() {
    setLeaveError(null);
    setLeaveLoading(true);
    onLeave()
      .catch(err => setLeaveError(err instanceof Error ? err.message : 'Could not leave team.'))
      .finally(() => setLeaveLoading(false));
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold"
            style={{ backgroundColor: team.avatarColor }}>
            {team.name[0]}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{team.name}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">/{team.slug}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Members', value: members.length },
            { label: 'Projects', value: team.projects.length },
            { label: 'Active sprints', value: team.projects.filter(p => p.sprints.some(s => s.status === 'active')).length },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-4">
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{stat.value}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Members section */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Members</h2>
            <button onClick={() => setShowInvite(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Invite member
            </button>
          </div>

          {/* Invite form */}
          {showInvite && (
            <form onSubmit={handleInvite}
              className="px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-3">Invite by email</p>
              {inviteError && (
                <p className="mb-2 text-xs text-red-600 dark:text-red-400">{inviteError}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button type="submit" disabled={inviteLoading}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                  {inviteLoading ? 'Sending…' : 'Send'}
                </button>
                <button type="button" onClick={() => setShowInvite(false)}
                  className="px-2 py-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              </div>
            </form>
          )}

          {memberActionError && (
            <p className="px-5 py-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border-b border-red-100 dark:border-red-900">
              {memberActionError}
            </p>
          )}

          {/* Member list */}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                <Avatar user={member} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{member.username}</p>
                  {member.id === currentUserId && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">You</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={member.role} />
                  {member.role !== 'owner' && member.id !== currentUserId && (
                    <div className="hidden group-hover:flex items-center gap-1">
                      <select
                        value={member.role}
                        onChange={e => {
                          setMemberActionError(null);
                          onRoleChange(member.id, e.target.value as UserRole)
                            .catch(err => setMemberActionError(err instanceof Error ? err.message : 'Could not change role.'));
                        }}
                        onClick={e => e.stopPropagation()}
                        className="text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none">
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button onClick={() => {
                          setMemberActionError(null);
                          onRemove(member.id).catch(err => setMemberActionError(err instanceof Error ? err.message : 'Could not remove member.'));
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 hidden sm:block">
                  Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="mt-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Danger zone</h2>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Leave team</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">You'll lose access to all projects in this team.</p>
              {leaveError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{leaveError}</p>
              )}
            </div>
            <button onClick={handleLeave} disabled={leaveLoading}
              className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-60 rounded-lg transition-colors">
              {leaveLoading ? 'Leaving…' : 'Leave team'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
