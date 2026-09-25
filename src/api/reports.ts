import { apiGet } from './client';
import type { Paginated } from './teams';

// Shapes match devboard-analytics' pydantic schemas (app/schemas/reports.py,
// app/schemas/events.py). Dates come back as ISO strings.

// The metadata union is keyed by `action`, not discriminated in the payload —
// each action only ever carries the fields its own metadata class defines.
export interface ActivityMetadata {
  field?: string;
  from?: string | null;
  to?: string | null;
  assignee_id?: string;
  epic_key?: string | null;
  label_name?: string | null;
  sprint_id?: string;
  sprint_name?: string | null;
  commit_sha?: string;
  commit_url?: string;
  commit_message?: string;
  repo?: string;
  // Comment events are keyed by comment id; this is the ticket they belong to.
  ticket_id?: string;
}

// Commits linked by the GitHub webhook are logged under this fixed all-zero actor id
// (devboard-integrations/app/webhooks/services.py SYSTEM_ACTOR_ID), not a real account.
export const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export interface ActivityEvent {
  _id: string | null;
  actor: string;
  actor_email: string | null;
  action: string;
  entity_type: 'ticket' | 'comment' | 'sprint' | 'project';
  entity_id: string;
  entity_key: string;
  project_id: string;
  metadata: ActivityMetadata;
  created_at: string;
}

export interface SprintVelocity {
  sprint_id: string;
  sprint_name: string;
  start_date: string | null;
  end_date: string | null;
  committed_points: number;
  completed_points: number;
  completed_tickets: number;
}

export interface VelocityReport {
  project_id: string;
  sprints: SprintVelocity[];
  average_points: number;
}

export interface BurndownDay {
  day: string;
  remaining_points: number;
  remaining_tickets: number;
  ideal_points: number;
}

export interface BurndownReport {
  sprint_id: string;
  sprint_name: string;
  start_date: string;
  end_date: string;
  committed_points: number;
  unpointed_tickets: number;
  days: BurndownDay[];
}

export interface TicketCycleTime {
  ticket_key: string;
  lead_time_days: number;
  cycle_time_days: number | null;
  reopened: number;
}

export interface CycleTimeReport {
  project_id: string;
  completed_tickets: number;
  median_lead_time_days: number;
  median_cycle_time_days: number;
  tickets: TicketCycleTime[];
}

// Contributors are auto-scoped to their own events server-side.
export const getActivity = (projectId: string, limit = 20, offset = 0) =>
  apiGet<Paginated<ActivityEvent>>(`/reports/projects/${projectId}/activity/`, { limit, offset });

// Everything that happened on one ticket, whoever did it, for any project member.
// Includes the ticket's comment events. Newest first.
export const getTicketActivity = (projectId: string, ticketId: string, limit = 20, offset = 0) =>
  apiGet<Paginated<ActivityEvent>>(`/reports/projects/${projectId}/tickets/${ticketId}/activity/`, { limit, offset });

// Lead-only (a contributor gets 403).
export const getVelocity = (projectId: string) =>
  apiGet<VelocityReport>(`/reports/projects/${projectId}/velocity/`);

export const getCycleTime = (projectId: string) =>
  apiGet<CycleTimeReport>(`/reports/projects/${projectId}/cycle-time/`);

// Path is /reports/sprints/..., not nested under a project. Lead-only, and only
// exists for a sprint that has been started (404 for a `created` one).
export const getBurndown = (sprintId: string) =>
  apiGet<BurndownReport>(`/reports/sprints/${sprintId}/burndown/`);
