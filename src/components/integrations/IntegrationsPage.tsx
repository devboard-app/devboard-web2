import { useState } from 'react';
import type { Team, Project } from '@/types';
import { useTeamIntegration } from '@/hooks/useTeamIntegration';
import { useRepoLinks } from '@/hooks/useRepoLinks';
import type { TeamIntegration, WebhookProvider, IntegrationPatch } from '@/api/integrations';

interface Props {
  team: Team;
  currentUserId: string;
}

const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;

// Sprint events are the only ones the backend ever sends to Slack/Discord.
const TRIGGERS = [
  { key: 'sprint.started', label: 'Sprint started' },
  { key: 'sprint.completed', label: 'Sprint completed' },
];

const PROVIDERS: Record<WebhookProvider, { name: string; placeholder: string; field: 'slack_webhook_url' | 'discord_webhook_url' }> = {
  slack: { name: 'Slack', placeholder: 'https://hooks.slack.com/services/…', field: 'slack_webhook_url' },
  discord: { name: 'Discord', placeholder: 'https://discord.com/api/webhooks/…', field: 'discord_webhook_url' },
};

const card = 'bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-4';
const inputCls = 'px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500';

function GitHubIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.607.069-.607 1.004.07 1.532 1.032 1.532 1.032.891 1.529 2.341 1.088 2.91.832.09-.646.349-1.086.635-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.254-.447-1.27.097-2.646 0 0 .84-.269 2.75 1.026A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.295 2.748-1.026 2.748-1.026.546 1.376.202 2.392.1 2.646.641.698 1.028 1.59 1.028 2.682 0 3.841-2.337 4.687-4.565 4.935.359.308.679.919.679 1.852 0 1.335-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.164 22 16.417 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function errorText(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

/** Webhook URLs are credentials: anyone holding one can post to the channel. */
function maskWebhook(url: string) {
  try {
    return `${new URL(url).host}/…${url.slice(-4)}`;
  } catch {
    return '••••••••';
  }
}

function GitHubCard({ teamId, projects }: { teamId: string; projects: Project[] }) {
  const { links, addLink, removeLink } = useRepoLinks(teamId);
  const [showAdd, setShowAdd] = useState(false);
  const [repo, setRepo] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectName = (id: string) => projects.find(p => p.id === id)?.name ?? 'Unknown project';

  async function handleAdd() {
    const value = repo.trim();
    if (!REPO_PATTERN.test(value)) { setError('Use the form owner/repository, e.g. acme/platform-core.'); return; }
    if (!projectId) { setError('Pick a project to link to.'); return; }
    setBusy(true);
    setError(null);
    try {
      await addLink(projectId, value);
      setRepo('');
      setShowAdd(false);
    } catch (err) {
      setError(errorText(err, 'Could not link the repository.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    setError(null);
    try {
      await removeLink(id);
    } catch (err) {
      setError(errorText(err, 'Could not remove the link.'));
    }
  }

  return (
    <div className={card}>
      <div className="flex items-start gap-4 px-5 py-5">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center flex-shrink-0">
          <span className="text-white dark:text-zinc-900"><GitHubIcon size={20} /></span>
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">GitHub</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Link a repository to a project. When a push has a commit message that mentions a ticket key (like PLT-12),
            the commit is attached to that ticket.
          </p>
          <details className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            <summary className="cursor-pointer font-medium text-indigo-600 dark:text-indigo-400">GitHub-side setup</summary>
            <p className="mt-1.5">
              In the repository's Settings → Webhooks, add a webhook that sends <span className="font-medium">push</span> events
              as <span className="font-mono">application/json</span> to
              {' '}<span className="font-mono">/api/webhooks/github/</span> on the integrations service, signed with the
              server's <span className="font-mono">GITHUB_WEBHOOK_SECRET</span>. DevBoard does not install a GitHub App.
            </p>
          </details>
        </div>
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 dark:bg-zinc-800/30">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Linked repositories</p>
          <button onClick={() => setShowAdd(v => !v)} disabled={projects.length === 0}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1 disabled:opacity-50">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            Link repo
          </button>
        </div>

        {showAdd && (
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex gap-2">
              <input autoFocus type="text" value={repo} onChange={e => setRepo(e.target.value)} placeholder="org/repository"
                className={`flex-1 font-mono ${inputCls}`}
                onKeyDown={e => { if (e.key === 'Enter') void handleAdd(); if (e.key === 'Escape') setShowAdd(false); }} />
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className={inputCls}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={() => void handleAdd()} disabled={busy}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                {busy ? 'Linking…' : 'Link'}
              </button>
              <button onClick={() => setShowAdd(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5">Match GitHub's capitalization exactly; a repository can only be linked once.</p>
          </div>
        )}

        {error && (
          <p className="px-5 py-2 text-xs text-red-600 dark:text-red-400 border-b border-zinc-100 dark:border-zinc-800">{error}</p>
        )}

        {links.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-600">No repos linked from this browser</p>
            <p className="text-xs text-zinc-300 dark:text-zinc-700 mt-0.5">
              The server can't list existing links, so only ones you create here are shown.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {links.map(link => (
              <div key={link.id} className="flex items-center gap-3 px-5 py-3 group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <GitHubIcon size={16} />
                <div className="flex-1">
                  <p className="text-sm font-mono font-medium text-zinc-800 dark:text-zinc-200">{link.githubRepo}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                    → {projectName(link.projectId)} · Linked {link.linkedAt.slice(0, 10)}
                  </p>
                </div>
                <button onClick={() => void handleRemove(link.id)} aria-label={`Unlink ${link.githubRepo}`}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-all">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2h3v1.5M5.5 6v4M7.5 6v4M3 3.5L3.5 11h6L10 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WebhookCard({ provider, integration, onSave }: {
  provider: WebhookProvider;
  integration: TeamIntegration | null;
  onSave: (patch: IntegrationPatch) => Promise<void>;
}) {
  const { name, placeholder, field } = PROVIDERS[provider];
  const current = integration?.[field] ?? null;
  const triggers = integration?.enabled_triggers[provider] ?? {};

  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(patch: IntegrationPatch, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await onSave(patch);
      after?.();
    } catch (err) {
      setError(errorText(err, `Could not update ${name}.`));
    } finally {
      setBusy(false);
    }
  }

  const saveUrl = () => run({ [field]: url.trim() }, () => { setEditing(false); setUrl(''); });
  const removeUrl = () => run({ [field]: null });

  // The backend replaces the whole map, so send back every other provider's toggles too.
  const toggle = (event: string, on: boolean) => run({
    enabled_triggers: {
      ...integration?.enabled_triggers,
      [provider]: { ...triggers, [event]: on },
    },
  });

  return (
    <div className={card}>
      <div className="flex items-start gap-4 px-5 py-5">
        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{name[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{name}</h2>
            {current ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium rounded-full border border-emerald-200 dark:border-emerald-900">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                Webhook set
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[11px] font-medium rounded-full">Not configured</span>
            )}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Post sprint updates to a {name} channel through an incoming webhook.</p>
          {current && !editing && (
            <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1.5 font-mono truncate">{maskWebhook(current)}</p>
          )}
        </div>
        {!editing && (
          <div className="flex-shrink-0 flex gap-2">
            <button onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              {current ? 'Replace' : 'Set webhook'}
            </button>
            {current && (
              <button onClick={() => void removeUrl()} disabled={busy}
                className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-60 transition-colors">
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex gap-2">
            <input autoFocus type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder={placeholder}
              className={`flex-1 font-mono ${inputCls}`}
              onKeyDown={e => { if (e.key === 'Enter' && url.trim()) void saveUrl(); if (e.key === 'Escape') setEditing(false); }} />
            <button onClick={() => void saveUrl()} disabled={busy || !url.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setUrl(''); setError(null); }} className="px-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">Cancel</button>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5">Must be an https {name} webhook URL. It is stored as-is and never shown in full again.</p>
        </div>
      )}

      {error && <p className="px-5 py-2 text-xs text-red-600 dark:text-red-400 border-t border-zinc-100 dark:border-zinc-800">{error}</p>}

      <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-3">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Notify on</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {TRIGGERS.map(t => (
            <label key={t.key} className={`flex items-center gap-2 text-sm ${current ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-600'}`}>
              <input type="checkbox" checked={Boolean(triggers[t.key])} disabled={!current || busy}
                onChange={e => void toggle(t.key, e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500" />
              {t.label}
            </label>
          ))}
        </div>
        {!current && <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5">Set a webhook first.</p>}
      </div>
    </div>
  );
}

export function IntegrationsPage({ team, currentUserId }: Props) {
  const role = team.members.find(m => m.id === currentUserId)?.role;
  // The backend returns 403 for everyone else, so don't ask.
  const isAdmin = role === 'owner' || role === 'admin';
  const { integration, loading, error, save } = useTeamIntegration(team.id, isAdmin);

  return (
    <div className="h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Integrations</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Connect your tools to {team.name}</p>
        </div>

        {!isAdmin ? (
          <div className={`${card} px-5 py-8 text-center`}>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Only team owners and admins can manage integrations.</p>
          </div>
        ) : loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <>
            <GitHubCard teamId={team.id} projects={team.projects} />
            <WebhookCard provider="slack" integration={integration} onSave={save} />
            <WebhookCard provider="discord" integration={integration} onSave={save} />

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
              {[
                { name: 'Figma', desc: 'Attach design files to tickets' },
                { name: 'Linear', desc: 'Two-way sync with Linear workspaces' },
              ].map(item => (
                <div key={item.name} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-zinc-400">{item.name[0]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{item.name}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">{item.desc}</p>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 rounded-full">Coming soon</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
