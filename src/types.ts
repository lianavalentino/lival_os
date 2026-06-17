export type AreaName =
  | "Consulting"
  | "Build Lab"
  | "Job Search"
  | "Life Admin"
  | "Home Ops"
  | "Learning";

export type TaskStatus =
  | "backlog"
  | "this_week"
  | "in_progress"
  | "blocked"
  | "done";

export type Priority = "high" | "medium" | "low";
export type ProjectStatus =
  | "planned"
  | "active"
  | "paused"
  | "blocked"
  | "completed"
  | "archived";
export type ProjectHealth = "on_track" | "attention" | "at_risk" | "blocked";
export type InboxType =
  | "email"
  | "appointment"
  | "idea"
  | "resource"
  | "note"
  | "task"
  | "other";

export interface Area {
  id: string;
  name: AreaName;
  description: string;
  color: string;
  sortOrder: number;
}

export interface Workspace {
  id: string;
  areaId: string;
  name: string;
  description: string;
  color: string;
  sortOrder: number;
}

export interface Project {
  id: string;
  areaId: string;
  workspaceId: string;
  name: string;
  description: string;
  goal: string;
  status: ProjectStatus;
  health: ProjectHealth;
  priority: Priority;
  progressPercent: number;
  startDate: string;
  targetDate: string;
}

export interface Task {
  id: string;
  areaId: string;
  workspaceId: string;
  projectId?: string;
  parentTaskId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  scheduledFor?: string;
  completedAt?: string;
  estimatedMinutes: number;
  sortOrder: number;
  labels: string[];
  source: "manual" | "email" | "shortcut" | "codex" | "imported";
}

export interface TimeEntry {
  id: string;
  areaId: string;
  workspaceId: string;
  projectId?: string;
  taskId?: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  description: string;
  source: "manual" | "codex" | "claude_code" | "shortcut" | "imported";
}

export interface InboxItem {
  id: string;
  type: InboxType;
  title: string;
  body: string;
  source: string;
  sourceUrl?: string;
  suggestedAreaId?: string;
  suggestedWorkspaceId?: string;
  suggestedProjectId?: string;
  suggestedTaskId?: string;
  confidence?: number;
  status: "new" | "reviewed" | "converted" | "archived";
  receivedAt: string;
  reviewedAt?: string;
}

export interface BrainDump {
  id: string;
  title: string;
  body: string;
  category: "idea" | "thought" | "someday" | "link" | "other";
  status: "captured" | "reviewed" | "converted" | "archived";
  source: string;
  convertedTaskId?: string;
  convertedProjectId?: string;
}

export interface ResourceItem {
  id: string;
  areaId?: string;
  workspaceId?: string;
  projectId?: string;
  title: string;
  url: string;
  description: string;
  category: string;
  tags: string[];
  source: string;
}

export interface WeeklySnapshot {
  id: string;
  weekStart: string;
  weekEnd: string;
  summary: string;
  momentumScore: number;
  tasksCompleted: number;
  hoursTracked: number;
  projectsAdvanced: number;
  ideasCaptured: number;
}

export interface ActivityEvent {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  message: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
}

export type TaskUpdateType =
  | "note"
  | "status_change"
  | "time_logged"
  | "file_change"
  | "system";

export interface TaskUpdate {
  id: string;
  taskId: string;
  updateType: TaskUpdateType;
  body: string;
  source: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface DailyPlan {
  id: string;
  planDate: string;
  mustDoTaskIds: string[];
  shouldDoTaskIds: string[];
  couldDoTaskIds: string[];
  notes?: string;
  generatedBy?: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPlan {
  id: string;
  weekStart: string;
  outcomes: string[];
  focusAreas: string[];
  openLoops: string[];
  generatedBy?: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface DailyPlanInput {
  planDate: string;
  mustDoTaskIds: string[];
  shouldDoTaskIds: string[];
  couldDoTaskIds: string[];
  notes?: string;
}

export interface WeeklyPlanInput {
  weekStart: string;
  outcomes: string[];
  focusAreas: string[];
  openLoops: string[];
}

export interface AppData {
  areas: Area[];
  workspaces: Workspace[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  inboxItems: InboxItem[];
  brainDumps: BrainDump[];
  resources: ResourceItem[];
  weeklySnapshots: WeeklySnapshot[];
  activityEvents: ActivityEvent[];
  taskUpdates: TaskUpdate[];
  dailyPlans: DailyPlan[];
  weeklyPlans: WeeklyPlan[];
}

export type ViewKey =
  | "command"
  | "daily"
  | "weekly"
  | "board"
  | "projects"
  | "project-detail"
  | "task-detail"
  | "inbox"
  | "brain-dump"
  | "resources"
  | "reports"
  | "archive"
  | "settings";

export interface CaptureDraft {
  title: string;
  body: string;
  type: InboxType | "task" | "brain";
  areaId: string;
}
