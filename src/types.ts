export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
export type TicketType = 'epic' | 'bug' | 'feature' | 'task' | 'improvement';
export type TicketStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
export type SprintStatus = 'created' | 'active' | 'completed';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TabType = 'board' | 'backlog' | 'sprints';
export const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;

export interface User {
  id: string;
  username: string;
  // Only the current user (via /api/users/me/) reliably has this — batch
  // user lookups (used to resolve everyone else) don't return email at all.
  email?: string;
  // Only present when the user has set one; the UI falls back to initials.
  avatar?: string;
  initials: string;
  color: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

// Matches what devboard-attachments' batch-resolve returns, embedded on a
// comment — there is no standalone ticket-level attachment endpoint. See
// src/hooks/useTicketComments.ts.
export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
}

export interface Comment {
  id: string;
  author: User;
  body: string;
  attachments: Attachment[];
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

// No `sprintId` field: the real ticket serializer never exposes one — sprint
// membership is only ever queried through GET .../sprints/{id}/tickets/ or
// implied by GET .../backlog/ (unsprinted tickets only), never read off the
// ticket object itself. See src/hooks/useProjectData.ts for how sprint
// ticket lists get fetched instead.
export interface Ticket {
  id: string;
  key: string;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  priority: Priority;
  assignee?: User;
  labels: Label[];
  // Always empty here — the board/backlog/sprint list endpoints this hydrates
  // from don't return comments. The real list is fetched on demand by
  // src/hooks/useTicketComments.ts only while the ticket panel is open.
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  storyPoints?: number;
  dueDate?: string;
  /** Set when this ticket is scoped under an epic (another ticket of type 'epic'). */
  parentEpicId?: string;
}

/** Minimal shape used to populate the "Epic" picker on a ticket. */
export interface EpicSummary {
  id: string;
  key: string;
  title: string;
}

export interface Sprint {
  id: string;
  name: string;
  status: SprintStatus;
  startDate?: string;
  endDate?: string;
  goal?: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string;
  tickets: Ticket[];
  sprints: Sprint[];
  members: User[];
  // Derived from ProjectMembership.role === 'lead'; gates the lead-only reports.
  leadIds: string[];
}

export interface TeamMember extends User {
  role: UserRole;
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  avatarColor: string;
  projects: Project[];
  members: TeamMember[];
}

// Matches devboard-integrations' Notification.to_dict(). `sprint_start` is
// deliberately absent — sprint events only ever go to Discord/Slack, never in-app.
export interface Notification {
  id: string;
  type: 'mention' | 'assignment' | 'comment' | 'status_change';
  message: string;
  read: boolean;
  createdAt: string;
  /** App-relative path, e.g. `/teams/:teamId/projects/:projectId/tickets/:ticketId`. */
  link: string | null;
}

export type AppView =
  | { screen: 'auth'; authMode: 'login' | 'register' | 'forgot' | 'verify' }
  | { screen: 'team'; teamId: string }
  | { screen: 'project'; teamId: string; projectId: string; tab: TabType; ticketId?: string }
  | { screen: 'labels'; teamId: string; projectId: string }
  | { screen: 'reports'; teamId: string; projectId: string }
  | { screen: 'members'; teamId: string; projectId: string }
  | { screen: 'integrations'; teamId: string }
  | { screen: 'profile'; teamId: string };
