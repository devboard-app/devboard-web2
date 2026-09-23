import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import type { AppView, Team, Notification, TabType, User } from '@/types';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { VerifyEmailPage } from '@/components/auth/VerifyEmailPage';
import { ResetPasswordPage } from '@/components/auth/ResetPasswordPage';
import { initAuth, logout } from '@/api/client';
import { getMe, type CoreUser } from '@/api/users';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { MembersPage } from '@/components/projects/MembersPage';
import { useTeamsData } from '@/hooks/useTeamsData';
import { useNotifications } from '@/hooks/useNotifications';
import { colorFor, initialsFor } from '@/lib/avatar';
import { AppShell } from '@/components/layout/AppShell';
import { TeamPage } from '@/components/teams/TeamPage';
import { ProjectPage } from '@/components/projects/ProjectPage';
import { LabelsPage } from '@/components/labels/LabelsPage';
import { ReportsPage } from '@/components/reports/ReportsPage';
import { IntegrationsPage } from '@/components/integrations/IntegrationsPage';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';

type AuthMode = Extract<AppView, { screen: 'auth' }>['authMode'];

function authModeToPath(mode: AuthMode): string {
  if (mode === 'register') return '/register';
  if (mode === 'forgot' || mode === 'verify') return '/forgot-password';
  return '/login';
}

// Placeholder teamId for "wherever the authed shell should land once real
// teams have loaded" — matches the /teams/:teamId route pattern so it
// resolves through the same code path as a real team, and renderAuthedShell
// already falls back to the first real team when the id in the URL doesn't
// match one (see getTeam below).
const PENDING_TEAM_PATH = '/teams/_';

function viewToPath(view: AppView): string {
  switch (view.screen) {
    case 'auth':
      return authModeToPath(view.authMode);
    case 'team':
      return `/teams/${view.teamId}`;
    case 'project':
      return `/teams/${view.teamId}/projects/${view.projectId}/${view.tab}`;
    case 'labels':
      return `/teams/${view.teamId}/projects/${view.projectId}/labels`;
    case 'members':
      return `/teams/${view.teamId}/projects/${view.projectId}/members`;
    case 'reports':
      return `/teams/${view.teamId}/projects/${view.projectId}/reports`;
    case 'integrations':
      return `/teams/${view.teamId}/integrations`;
    case 'profile':
      return `/teams/${view.teamId}/profile`;
  }
}

type AuthedView = Exclude<AppView, { screen: 'auth' }>;

/**
 * Reconstructs the AppView the rest of the app expects from the current URL.
 * Parses the path directly rather than using react-router's `useParams()`,
 * since this runs in `App` itself — above `<Routes>`, not inside a matched
 * `<Route>` element — where `useParams()` has no route match to read from
 * and always returns `{}`.
 */
function deriveView(pathname: string, teams: Team[]): AuthedView {
  const teamId = pathname.match(/^\/teams\/([^/]+)/)?.[1] ?? teams[0]?.id ?? '';
  const projectId = pathname.match(/\/projects\/([^/]+)/)?.[1];
  const ticketId = pathname.match(/\/projects\/[^/]+\/tickets\/([^/]+)/)?.[1];

  if (pathname.endsWith('/integrations')) return { screen: 'integrations', teamId };
  if (!projectId && pathname.endsWith('/profile')) return { screen: 'profile', teamId };
  if (projectId && pathname.endsWith('/labels')) return { screen: 'labels', teamId, projectId };
  if (projectId && pathname.endsWith('/members')) return { screen: 'members', teamId, projectId };
  if (projectId && pathname.endsWith('/reports')) return { screen: 'reports', teamId, projectId };
  if (projectId && ticketId) return { screen: 'project', teamId, projectId, tab: 'board', ticketId };
  if (projectId) {
    const tab = (['board', 'backlog', 'sprints'] satisfies TabType[]).find(t => pathname.endsWith(`/${t}`)) ?? 'board';
    return { screen: 'project', teamId, projectId, tab };
  }
  return { screen: 'team', teamId };
}

function toUser(me: CoreUser): User {
  return { id: me.user_id, username: me.username, email: me.email, avatar: me.avatar || undefined, initials: initialsFor(me.username), color: colorFor(me.username) };
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDark, setIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  const navigate = useNavigate();
  const location = useLocation();

  const {
    teams, loading: teamsLoading, error: teamsError,
    createTeam, createProject, addProjectMember, changeProjectMemberRole, removeProjectMember, inviteMember, changeMemberRole, removeMember, leaveTeam,
  } = useTeamsData(authed);

  const { notifications, total: notificationsTotal, error: notificationsError, markRead, markAllRead, dismiss: dismissNotif } = useNotifications(authed);

  const view = deriveView(location.pathname, teams);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // A hard reload loses the in-memory access token (never persisted, see
  // src/api/client.ts) — trade the localStorage refresh token for a fresh
  // one before rendering anything that depends on `authed`, so a valid
  // session doesn't flash the login screen.
  useEffect(() => {
    initAuth().then(ok => {
      setAuthed(ok);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!authed) { setMe(null); return; }
    getMe().then(profile => setMe(toUser(profile))).catch(() => setMe(null));
  }, [authed]);

  // Once real teams load, swap the post-login placeholder path for the
  // actual first team's URL so the address bar doesn't keep showing "_".
  useEffect(() => {
    if (!teamsLoading && teams.length > 0 && location.pathname === PENDING_TEAM_PATH) {
      navigate(viewToPath({ screen: 'team', teamId: teams[0].id }), { replace: true });
    }
  }, [teamsLoading, teams, location.pathname, navigate]);

  function handleAuthSuccess() {
    setAuthed(true);
    navigate(PENDING_TEAM_PATH);
  }

  async function handleLogout() {
    await logout();
    setAuthed(false);
    navigate('/login');
  }

  function goTo(v: AppView) {
    setShowNotifications(false);
    navigate(viewToPath(v));
  }

  function getTeam(teamId: string) {
    return teams.find(t => t.id === teamId) ?? teams[0];
  }

  function getProject(teamId: string, projectId: string) {
    const team = getTeam(teamId);
    return team.projects.find(p => p.id === projectId) ?? null;
  }

  function openNotification(notif: Notification) {
    if (!notif.read) void markRead(notif.id);
    // Only follow in-app paths; the backend builds these, but never navigate to anything else.
    if (notif.link && /^\/teams\//.test(notif.link)) {
      setShowNotifications(false);
      navigate(notif.link);
    }
  }

  function renderAuthedShell() {
    if (teamsLoading && teams.length === 0) {
      return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading your teams…</p>
        </div>
      );
    }

    if (teamsError && teams.length === 0) {
      return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
          <p className="text-sm text-red-600 dark:text-red-400">{teamsError}</p>
        </div>
      );
    }

    if (teams.length === 0) {
      return <WelcomeCreateTeam onCreateTeam={createTeam} onLogout={() => void handleLogout()} />;
    }

    const currentTeam = getTeam(view.teamId);

    function renderContent() {
      if (view.screen === 'team') {
        return (
          <TeamPage
            team={currentTeam}
            currentUserId={me?.id ?? ''}
            onInvite={(email, role) => inviteMember(currentTeam.id, email, role)}
            onRoleChange={(userId, role) => changeMemberRole(currentTeam.id, userId, role)}
            onRemove={(userId) => removeMember(currentTeam.id, userId)}
            onLeave={() => leaveTeam(currentTeam.id)}
          />
        );
      }
      if (view.screen === 'project') {
        const project = getProject(view.teamId, view.projectId);
        if (!project) return <NoProjectsYet />;
        return (
          <ProjectPage
            teamId={view.teamId}
            project={project}
            currentUserId={me?.id ?? ''}
            tab={view.tab}
            deepLinkTicketId={view.ticketId}
            onTabChange={(tab: TabType) => goTo({ ...view, tab, ticketId: undefined })}
            onCloseDeepLink={() => navigate(viewToPath({ ...view, ticketId: undefined }), { replace: true })}
          />
        );
      }
      if (view.screen === 'labels') {
        const project = getProject(view.teamId, view.projectId);
        if (!project) return <NoProjectsYet />;
        return <LabelsPage teamId={view.teamId} project={project} />;
      }
      if (view.screen === 'members') {
        const project = getProject(view.teamId, view.projectId);
        if (!project) return <NoProjectsYet />;
        return (
          <MembersPage
            team={currentTeam}
            project={project}
            currentUserId={me?.id ?? ''}
            onAdd={(userId, role) => addProjectMember(currentTeam.id, project.id, userId, role)}
            onChangeRole={(userId, role) => changeProjectMemberRole(currentTeam.id, project.id, userId, role)}
            onRemove={(userId) => removeProjectMember(currentTeam.id, project.id, userId)}
          />
        );
      }
      if (view.screen === 'reports') {
        const project = getProject(view.teamId, view.projectId);
        if (!project) return <NoProjectsYet />;
        return <ReportsPage teamId={view.teamId} project={project} currentUserId={me?.id ?? ''} />;
      }
      if (view.screen === 'profile') {
        return <ProfilePage onSaved={profile => setMe(toUser(profile))} />;
      }
      if (view.screen === 'integrations') {
        return <IntegrationsPage key={currentTeam.id} team={currentTeam} currentUserId={me?.id ?? ''} />;
      }
      return null;
    }

    return (
      <>
        <AppShell
          teams={teams}
          view={view}
          notifications={notifications}
          currentUser={me ?? { id: '', username: '…', initials: '?', color: '#6366F1' }}
          isDark={isDark}
          onNavigate={goTo}
          onToggleDark={() => setIsDark(v => !v)}
          onMarkAllRead={() => void markAllRead()}
          onShowNotifications={() => setShowNotifications(v => !v)}
          showNotifications={showNotifications}
          onLogout={() => void handleLogout()}
          onCreateTeam={createTeam}
          onCreateProject={createProject}>
          {renderContent()}
        </AppShell>

        {showNotifications && (
          <NotificationsPanel
            notifications={notifications}
            total={notificationsTotal}
            error={notificationsError}
            onClose={() => setShowNotifications(false)}
            onMarkAllRead={markAllRead}
            onOpen={openNotification}
            onDismiss={dismissNotif}
          />
        )}
      </>
    );
  }

  if (!authChecked) {
    return <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" />;
  }

  return (
    <Routes>
      <Route path="/login" element={<AuthScreen mode="login" onSuccess={handleAuthSuccess} onModeChange={(m) => navigate(authModeToPath(m))} />} />
      <Route path="/register" element={<AuthScreen mode="register" onSuccess={handleAuthSuccess} onModeChange={(m) => navigate(authModeToPath(m))} />} />
      <Route path="/forgot-password" element={<AuthScreen mode="forgot" onSuccess={handleAuthSuccess} onModeChange={(m) => navigate(authModeToPath(m))} />} />
      <Route path="/auth/verify-email" element={<VerifyEmailPage onGoToLogin={() => navigate('/login')} />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage onGoToLogin={() => navigate('/login')} />} />

      <Route path="/teams/:teamId" element={authed ? renderAuthedShell() : <Navigate to="/login" replace />} />
      <Route path="/teams/:teamId/profile" element={authed ? renderAuthedShell() : <Navigate to="/login" replace />} />
      <Route path="/teams/:teamId/integrations" element={authed ? renderAuthedShell() : <Navigate to="/login" replace />} />
      <Route path="/teams/:teamId/projects/:projectId/board" element={authed ? renderAuthedShell() : <Navigate to="/login" replace />} />
      <Route path="/teams/:teamId/projects/:projectId/backlog" element={authed ? renderAuthedShell() : <Navigate to="/login" replace />} />
      <Route path="/teams/:teamId/projects/:projectId/sprints" element={authed ? renderAuthedShell() : <Navigate to="/login" replace />} />
      <Route path="/teams/:teamId/projects/:projectId/tickets/:ticketId" element={authed ? renderAuthedShell() : <Navigate to="/login" replace />} />
      <Route path="/teams/:teamId/projects/:projectId/labels" element={authed ? renderAuthedShell() : <Navigate to="/login" replace />} />
      <Route path="/teams/:teamId/projects/:projectId/members" element={authed ? renderAuthedShell() : <Navigate to="/login" replace />} />
      <Route path="/teams/:teamId/projects/:projectId/reports" element={authed ? renderAuthedShell() : <Navigate to="/login" replace />} />

      <Route path="*" element={<Navigate to={authed ? PENDING_TEAM_PATH : '/login'} replace />} />
    </Routes>
  );
}

function NoProjectsYet() {
  return (
    <div className="h-full flex items-center justify-center px-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">No projects in this team yet — create one from the sidebar.</p>
    </div>
  );
}

function WelcomeCreateTeam({ onCreateTeam, onLogout }: { onCreateTeam: (name: string, description?: string) => Promise<void>; onLogout: () => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onCreateTeam(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create team.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Welcome to DevBoard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">You're not on any team yet. Create one to get started.</p>
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Team name</label>
            <input type="text" required autoFocus value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              placeholder="Acme Engineering" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
            {loading ? 'Creating…' : 'Create team'}
          </button>
        </form>
        <button onClick={onLogout} className="mt-6 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
          Sign out
        </button>
      </div>
    </div>
  );
}
