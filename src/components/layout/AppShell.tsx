import { useState } from 'react';
import type { Team, Notification, AppView, TabType, User } from '@/types';

interface Props {
  teams: Team[];
  view: AppView;
  notifications: Notification[];
  currentUser: User;
  isDark: boolean;
  onNavigate: (view: AppView) => void;
  onToggleDark: () => void;
  onMarkAllRead: () => void;
  onShowNotifications: () => void;
  showNotifications: boolean;
  onLogout: () => void;
  onCreateTeam: (name: string, description?: string) => Promise<void>;
  onCreateProject: (teamId: string, name: string, key: string, description?: string) => Promise<void>;
  children: React.ReactNode;
}

function suggestKey(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
}

function Avatar({ user, size = 'sm' }: { user: User; size?: 'xs' | 'sm' | 'md' }) {
  const sz = size === 'xs' ? 'w-5 h-5 text-[10px]' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  // A broken or blocked image falls back to initials instead of leaving a hole.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(user.avatar) && user.avatar!.startsWith('https://') && !imageFailed;
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 overflow-hidden`}
      style={{ backgroundColor: user.color }}>
      {showImage ? (
        <img src={user.avatar} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className="w-full h-full object-cover" />
      ) : user.initials}
    </div>
  );
}

export { Avatar };

export function AppShell({ teams, view, notifications, currentUser, isDark, onNavigate, onToggleDark, onMarkAllRead, onShowNotifications, showNotifications, onLogout, onCreateTeam, onCreateProject, children }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [teamMenuOpen, setTeamMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLoading, setNewTeamLoading] = useState(false);
  const [newTeamError, setNewTeamError] = useState<string | null>(null);

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectKey, setNewProjectKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [newProjectLoading, setNewProjectLoading] = useState(false);
  const [newProjectError, setNewProjectError] = useState<string | null>(null);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    setNewTeamError(null);
    setNewTeamLoading(true);
    try {
      await onCreateTeam(newTeamName);
      setNewTeamName('');
      setNewTeamOpen(false);
      setTeamMenuOpen(false);
    } catch (err) {
      setNewTeamError(err instanceof Error ? err.message : 'Could not create team.');
    } finally {
      setNewTeamLoading(false);
    }
  }

  async function handleCreateProject(teamId: string, e: React.FormEvent) {
    e.preventDefault();
    setNewProjectError(null);
    setNewProjectLoading(true);
    try {
      await onCreateProject(teamId, newProjectName, newProjectKey);
      setNewProjectName('');
      setNewProjectKey('');
      setKeyTouched(false);
      setNewProjectOpen(false);
    } catch (err) {
      setNewProjectError(err instanceof Error ? err.message : 'Could not create project.');
    } finally {
      setNewProjectLoading(false);
    }
  }

  const activeTeamId = 'teamId' in view ? view.teamId : (view.screen === 'auth' ? '' : '');
  const activeProjectId = 'projectId' in view ? view.projectId : null;
  const activeTab = view.screen === 'project' ? view.tab : null;
  const unread = notifications.filter(n => !n.read).length;

  const currentTeam = teams.find(t => t.id === activeTeamId) ?? teams[0];

  function navToProject(teamId: string, projectId: string, tab: TabType = 'board') {
    onNavigate({ screen: 'project', teamId, projectId, tab });
    setMobileMenuOpen(false);
  }

  const navItems = [
    {
      label: 'Team',
      icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M5 6a2 2 0 100-4 2 2 0 000 4zM10 6a2 2 0 100-4 2 2 0 000 4zM1 13c0-2.21 1.79-4 4-4h.1M14 13c0-2.21-1.79-4-4-4h-.1M7.5 11a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
      ),
      active: view.screen === 'team',
      onClick: () => { onNavigate({ screen: 'team', teamId: currentTeam.id }); setMobileMenuOpen(false); },
    },
    {
      label: 'Integrations',
      icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M5.5 2.5v10M9.5 2.5v10M2.5 5.5h10M2.5 9.5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
      ),
      active: view.screen === 'integrations',
      onClick: () => { onNavigate({ screen: 'integrations', teamId: currentTeam.id }); setMobileMenuOpen(false); },
    },
  ];

  const sidebar = (
    <nav className="flex flex-col h-full">
      {/* Team switcher */}
      <div className="px-3 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="relative">
          <button
            onClick={() => setTeamMenuOpen(v => !v)}
            aria-haspopup="true" aria-expanded={teamMenuOpen} aria-label={`Switch team, current: ${currentTeam.name}`}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: currentTeam.avatarColor }}>
              {currentTeam.name[0]}
            </div>
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate flex-1 text-left">{currentTeam.name}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-zinc-400 flex-shrink-0">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {teamMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden z-50">
              {teams.map(team => (
                <button key={team.id} onClick={() => { onNavigate({ screen: 'team', teamId: team.id }); setTeamMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: team.avatarColor }}>{team.name[0]}</div>
                  <span className="truncate">{team.name}</span>
                  {team.id === currentTeam.id && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto text-indigo-600 dark:text-indigo-400">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
              <div className="border-t border-zinc-100 dark:border-zinc-800">
                {newTeamOpen ? (
                  <form onSubmit={handleCreateTeam} className="p-3 space-y-2" onClick={e => e.stopPropagation()}>
                    {newTeamError && <p className="text-xs text-red-600 dark:text-red-400" role="alert">{newTeamError}</p>}
                    <label htmlFor="new-team-name" className="sr-only">Team name</label>
                    <input id="new-team-name" autoFocus type="text" required value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                      placeholder="Team name"
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <div className="flex gap-1.5">
                      <button type="submit" disabled={newTeamLoading}
                        className="flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors">
                        {newTeamLoading ? 'Creating…' : 'Create'}
                      </button>
                      <button type="button" onClick={() => setNewTeamOpen(false)}
                        className="px-2.5 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setNewTeamOpen(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><path d="M7.5 3v9M3 7.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    New team
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav items */}
      <div className="px-3 py-2">
        {navItems.map(item => (
          <button key={item.label} onClick={item.onClick}
            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
              item.active
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-medium'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}>
            <span className={item.active ? 'text-indigo-600 dark:text-indigo-400' : ''}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Projects */}
      <div className="px-3 py-2 flex-1 overflow-y-auto">
        <p className="px-2 mb-1 text-[11px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-600 uppercase">Projects</p>
        {currentTeam.projects.map(project => (
          <div key={project.id}>
            <button
              onClick={() => navToProject(currentTeam.id, project.id)}
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
                activeProjectId === project.id && view.screen === 'project'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}>
              <span className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex-shrink-0">
                {project.key[0]}
              </span>
              <span className="truncate flex-1 text-left">{project.name}</span>
            </button>
            {/* Sub-nav when project active */}
            {activeProjectId === project.id && (view.screen === 'project' || view.screen === 'reports' || view.screen === 'labels' || view.screen === 'members') && (
              <div className="ml-6 mb-1">
                {(['board', 'backlog', 'sprints'] as TabType[]).map(tab => (
                  <button key={tab} onClick={() => navToProject(currentTeam.id, project.id, tab)}
                    className={`w-full text-left px-2 py-1 rounded text-xs capitalize transition-colors ${
                      activeTab === tab
                        ? 'text-indigo-700 dark:text-indigo-400 font-medium'
                        : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}>
                    {tab}
                  </button>
                ))}
                <button onClick={() => onNavigate({ screen: 'reports', teamId: currentTeam.id, projectId: project.id })}
                  className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                    (view as AppView).screen === 'reports' ? 'text-indigo-700 dark:text-indigo-400 font-medium' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}>
                  Reports
                </button>
                <button onClick={() => onNavigate({ screen: 'labels', teamId: currentTeam.id, projectId: project.id })}
                  className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                    (view as AppView).screen === 'labels' || (view as AppView).screen === 'members' ? 'text-indigo-700 dark:text-indigo-400 font-medium' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}>
                  Settings
                </button>
              </div>
            )}
          </div>
        ))}
        {newProjectOpen ? (
          <form onSubmit={e => void handleCreateProject(currentTeam.id, e)} className="px-2 py-2 space-y-2">
            {newProjectError && <p className="text-xs text-red-600 dark:text-red-400" role="alert">{newProjectError}</p>}
            <label htmlFor="new-project-name" className="sr-only">Project name</label>
            <input id="new-project-name" autoFocus type="text" required value={newProjectName}
              onChange={e => {
                setNewProjectName(e.target.value);
                if (!keyTouched) setNewProjectKey(suggestKey(e.target.value));
              }}
              placeholder="Project name"
              className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <label htmlFor="new-project-key" className="sr-only">Project key (2-10 uppercase letters/numbers)</label>
            <input id="new-project-key" type="text" required pattern="[A-Z0-9]{2,10}" title="2-10 uppercase letters/numbers" value={newProjectKey}
              onChange={e => { setKeyTouched(true); setNewProjectKey(e.target.value.toUpperCase()); }}
              placeholder="KEY"
              className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase" />
            <div className="flex gap-1.5">
              <button type="submit" disabled={newProjectLoading}
                className="flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors">
                {newProjectLoading ? 'Creating…' : 'Create'}
              </button>
              <button type="button" onClick={() => { setNewProjectOpen(false); setKeyTouched(false); }}
                className="px-2.5 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setNewProjectOpen(true)}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            New project
          </button>
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-3 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
        {/* Notifications */}
        <button onClick={onShowNotifications}
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          aria-haspopup="true" aria-expanded={showNotifications}
          className="relative p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2a4.5 4.5 0 00-4.5 4.5V9L2 11h12l-1.5-2V6.5A4.5 4.5 0 008 2zM6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          {unread > 0 && (
            <span aria-hidden="true" className="absolute top-0.5 right-0.5 w-4 h-4 bg-indigo-600 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* Dark mode toggle */}
        <button onClick={onToggleDark}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.22 3.22l1.06 1.06M11.72 11.72l1.06 1.06M3.22 12.78l1.06-1.06M11.72 4.28l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.5 9.5A6 6 0 016.5 2.5a6 6 0 100 11 6 6 0 007-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          )}
        </button>

        {/* Profile */}
        <div className="relative ml-auto">
          <button onClick={() => setProfileMenuOpen(v => !v)}
            aria-label={`Open profile menu for ${currentUser.username}`}
            aria-haspopup="true" aria-expanded={profileMenuOpen}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full">
            <Avatar user={currentUser} size="sm" />
          </button>
          {profileMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden z-50">
              <div className="px-3 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{currentUser.username}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{currentUser.email}</p>
              </div>
              <div className="py-1">
                <button onClick={() => { setProfileMenuOpen(false); onNavigate({ screen: 'profile', teamId: currentTeam.id }); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  Profile settings
                </button>
                {['Keyboard shortcuts', 'Help & support'].map(item => (
                  <button key={item} onClick={() => setProfileMenuOpen(false)}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    {item}
                  </button>
                ))}
              </div>
              <div className="border-t border-zinc-100 dark:border-zinc-800 py-1">
                <button onClick={() => { setProfileMenuOpen(false); onLogout(); }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-64 h-full bg-white dark:bg-zinc-900 shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <button onClick={() => setMobileMenuOpen(true)} aria-label="Open menu" className="p-1.5 text-zinc-500 dark:text-zinc-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" fill="white" /><rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" /><rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" /><rect x="9" y="9" width="5" height="5" rx="1" fill="white" /></svg>
            </div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">DevBoard</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onShowNotifications}
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              className="relative p-1.5 text-zinc-500 dark:text-zinc-400">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2a4.5 4.5 0 00-4.5 4.5V9L2 11h12l-1.5-2V6.5A4.5 4.5 0 008 2zM6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
              {unread > 0 && <span aria-hidden="true" className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-indigo-600 rounded-full text-[8px] text-white font-bold flex items-center justify-center">{unread}</span>}
            </button>
            <Avatar user={currentUser} size="sm" />
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
