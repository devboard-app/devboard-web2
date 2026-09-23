import { apiGet, apiPost, apiPatch, apiDelete } from './client';

// Shapes match devboard-integrations (app/integrations/models.py, views.py).
// Every route is team-scoped and requires the caller to be a team owner or admin
// (403 for anyone else, including plain members).

export type WebhookProvider = 'slack' | 'discord';

// Only sprint events are ever checked against this map (consumer/handlers.py), and
// only for a provider that also has a webhook URL set. The backend stores whatever
// JSON it is given, so the client must send the whole map back on every change.
export type EnabledTriggers = Partial<Record<WebhookProvider, Record<string, boolean>>>;

export interface TeamIntegration {
  id: string;
  team_id: string;
  slack_webhook_url: string | null;
  discord_webhook_url: string | null;
  enabled_triggers: EnabledTriggers;
  created_at: string;
  updated_at: string;
}

export interface IntegrationPatch {
  slack_webhook_url?: string | null;
  discord_webhook_url?: string | null;
  enabled_triggers?: EnabledTriggers;
}

export interface ApiRepoLink {
  id: string;
  team_id: string;
  project_id: string;
  github_repo: string;
}

const base = (teamId: string) => `/api/integrations/${teamId}/`;

// 404 when the team has never configured an integration.
export const getIntegration = (teamId: string) => apiGet<TeamIntegration>(base(teamId));

export const createIntegration = (teamId: string, body: IntegrationPatch) =>
  apiPost<TeamIntegration>(base(teamId), body);

export const updateIntegration = (teamId: string, patch: IntegrationPatch) =>
  apiPatch<TeamIntegration>(base(teamId), patch);

// There is no endpoint to list repo links — see BACKEND_GAPS.md #14.
export const createRepoLink = (teamId: string, projectId: string, githubRepo: string) =>
  apiPost<ApiRepoLink>(`${base(teamId)}repo-links/`, { project_id: projectId, github_repo: githubRepo });

export const deleteRepoLink = (teamId: string, linkId: string) =>
  apiDelete<void>(`${base(teamId)}repo-links/${linkId}/`);
