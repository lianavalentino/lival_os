import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  ActivityEvent,
  AppData,
  Area,
  BrainDump,
  CaptureDraft,
  DailyPlan,
  DailyPlanInput,
  InboxItem,
  Project,
  ResourceItem,
  Task,
  TaskUpdate,
  TimeEntry,
  WeeklyPlan,
  WeeklyPlanInput,
  WeeklySnapshot,
  Workspace,
} from "../types";
import {
  appendTaskUpdate as appendLocalTaskUpdate,
  convertInboxItem as convertLocalInboxItem,
  createCapture as createLocalCapture,
  loadLocalData,
  resetLocalData,
  saveLocalData,
  updateInboxStatus as updateLocalInboxStatus,
  updateTaskStatus as updateLocalTaskStatus,
  upsertDailyPlan as upsertLocalDailyPlan,
  upsertWeeklyPlan as upsertLocalWeeklyPlan,
} from "./storage";

export type RepositoryMode = "demo" | "supabase";
export type InboxConversionTarget = "task" | "project" | "resource";

export interface AppRepository {
  mode: RepositoryMode;
  loadData(): Promise<AppData>;
  createCapture(draft: CaptureDraft, currentData: AppData): Promise<AppData>;
  updateTaskStatus(
    currentData: AppData,
    taskId: string,
    status: Task["status"],
  ): Promise<AppData>;
  updateInboxStatus(
    currentData: AppData,
    inboxId: string,
    status: InboxItem["status"],
  ): Promise<AppData>;
  convertInboxItem(
    currentData: AppData,
    inboxId: string,
    target: InboxConversionTarget,
  ): Promise<AppData>;
  upsertDailyPlan(
    currentData: AppData,
    input: DailyPlanInput,
  ): Promise<AppData>;
  upsertWeeklyPlan(
    currentData: AppData,
    input: WeeklyPlanInput,
  ): Promise<AppData>;
  appendTaskUpdate(
    currentData: AppData,
    taskId: string,
    body: string,
  ): Promise<AppData>;
  resetDemoData?(): Promise<AppData>;
}

const selectAll = "*";

export class LocalDemoRepository implements AppRepository {
  mode: RepositoryMode = "demo";

  async loadData() {
    return loadLocalData();
  }

  async createCapture(draft: CaptureDraft, currentData: AppData) {
    const next = createLocalCapture(draft, currentData);
    saveLocalData(next);
    return next;
  }

  async updateTaskStatus(currentData: AppData, taskId: string, status: Task["status"]) {
    const next = updateLocalTaskStatus(currentData, taskId, status);
    saveLocalData(next);
    return next;
  }

  async updateInboxStatus(
    currentData: AppData,
    inboxId: string,
    status: InboxItem["status"],
  ) {
    const next = updateLocalInboxStatus(currentData, inboxId, status);
    saveLocalData(next);
    return next;
  }

  async convertInboxItem(
    currentData: AppData,
    inboxId: string,
    target: InboxConversionTarget,
  ) {
    const next = convertLocalInboxItem(currentData, inboxId, target);
    saveLocalData(next);
    return next;
  }

  async upsertDailyPlan(currentData: AppData, input: DailyPlanInput) {
    return upsertLocalDailyPlan(currentData, input);
  }

  async upsertWeeklyPlan(currentData: AppData, input: WeeklyPlanInput) {
    return upsertLocalWeeklyPlan(currentData, input);
  }

  async appendTaskUpdate(currentData: AppData, taskId: string, body: string) {
    return appendLocalTaskUpdate(currentData, taskId, body);
  }

  async resetDemoData() {
    resetLocalData();
    return loadLocalData();
  }
}

export class SupabaseRepository implements AppRepository {
  mode: RepositoryMode = "supabase";

  constructor(
    private client: SupabaseClient,
    private user: User,
  ) {}

  async ensureProfile() {
    const { error } = await this.client.from("profiles").upsert({
      id: this.user.id,
      email: this.user.email || "",
      display_name: this.user.user_metadata?.display_name || "Liana",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles",
      week_starts_on: 1,
    });

    if (error) throw error;
  }

  async loadData() {
    await this.ensureProfile();

    const [
      areas,
      workspaces,
      projects,
      tasks,
      timeEntries,
      inboxItems,
      brainDumps,
      resources,
      weeklySnapshots,
      activityEvents,
      taskUpdates,
      dailyPlans,
      weeklyPlans,
    ] = await Promise.all([
      this.fetchTable("areas", "sort_order"),
      this.fetchTable("workspaces", "sort_order"),
      this.fetchTable("projects", "target_date"),
      this.fetchTable("tasks", "sort_order"),
      this.fetchTable("time_entries", "started_at", false),
      this.fetchTable("inbox_items", "received_at", false),
      this.fetchTable("brain_dumps", "created_at", false),
      this.fetchTable("resources", "category"),
      this.fetchTable("weekly_snapshots", "week_start", false),
      this.fetchTable("activity_events", "created_at", false),
      this.fetchTable("task_updates", "created_at", false),
      this.fetchTable("daily_plans", "plan_date", false),
      this.fetchTable("weekly_plans", "week_start", false),
    ]);

    return {
      areas: areas.map(mapArea),
      workspaces: workspaces.map(mapWorkspace),
      projects: projects.map(mapProject),
      tasks: tasks.map(mapTask),
      timeEntries: timeEntries.map(mapTimeEntry),
      inboxItems: inboxItems.map(mapInboxItem),
      brainDumps: brainDumps.map(mapBrainDump),
      resources: resources.map(mapResource),
      weeklySnapshots: weeklySnapshots.map(mapWeeklySnapshot),
      activityEvents: activityEvents.map(mapActivityEvent),
      taskUpdates: taskUpdates.map(mapTaskUpdate),
      dailyPlans: dailyPlans.map(mapDailyPlan),
      weeklyPlans: weeklyPlans.map(mapWeeklyPlan),
    };
  }

  async createCapture(draft: CaptureDraft, currentData: AppData) {
    const areaId = draft.areaId || currentData.areas[0]?.id;
    const workspaceId =
      currentData.workspaces.find((workspace) => workspace.areaId === areaId)?.id ||
      currentData.workspaces[0]?.id;
    const timestamp = new Date().toISOString();
    const title = draft.title.trim();
    const body = draft.body.trim();

    if (draft.type === "task") {
      const { data: task, error } = await this.client
        .from("tasks")
        .insert({
          user_id: this.user.id,
          area_id: areaId,
          workspace_id: workspaceId,
          title,
          description: body,
          status: "backlog",
          priority: "medium",
          estimated_minutes: 30,
          sort_order: currentData.tasks.length + 1,
          labels: ["capture"],
          source: "manual",
        })
        .select("id")
        .single();
      if (error) throw error;
      await this.insertActivity("task", task.id, "captured", `Captured task: ${title}`, {
        source: "quick_capture",
      });
      return this.loadData();
    }

    if (draft.type === "brain") {
      const { data: entry, error } = await this.client
        .from("brain_dumps")
        .insert({
          user_id: this.user.id,
          title,
          body,
          category: "idea",
          status: "captured",
          source: "quick capture",
        })
        .select("id")
        .single();
      if (error) throw error;
      await this.insertActivity("brain_dump", entry.id, "captured", `Captured idea: ${title}`, {
        source: "quick_capture",
      });
      return this.loadData();
    }

    const { data: inbox, error } = await this.client
      .from("inbox_items")
      .insert({
        user_id: this.user.id,
        type: draft.type,
        title,
        body,
        source: "quick capture",
        suggested_area_id: areaId,
        suggested_workspace_id: workspaceId,
        confidence: 0.7,
        status: "new",
        received_at: timestamp,
      })
      .select("id")
      .single();
    if (error) throw error;
    await this.insertActivity("inbox_item", inbox.id, "captured", `Captured inbox item: ${title}`, {
      type: draft.type,
    });
    return this.loadData();
  }

  async updateTaskStatus(
    currentData: AppData,
    taskId: string,
    status: Task["status"],
  ) {
    const task = currentData.tasks.find((item) => item.id === taskId);
    const { error } = await this.client
      .from("tasks")
      .update({
        status,
        completed_at: status === "done" ? new Date().toISOString() : null,
      })
      .eq("id", taskId);
    if (error) throw error;
    await this.insertActivity(
      "task",
      taskId,
      "status_changed",
      `Moved task to ${status.replace("_", " ")}: ${task?.title || "Untitled task"}`,
      { status },
    );
    return this.loadData();
  }

  async updateInboxStatus(
    _currentData: AppData,
    inboxId: string,
    status: InboxItem["status"],
  ) {
    const { error } = await this.client
      .from("inbox_items")
      .update({
        status,
        reviewed_at:
          status === "reviewed" || status === "converted" || status === "archived"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", inboxId);
    if (error) throw error;
    await this.insertActivity("inbox_item", inboxId, status, `Marked inbox item ${status}`, {
      status,
    });
    return this.loadData();
  }

  async convertInboxItem(
    currentData: AppData,
    inboxId: string,
    target: InboxConversionTarget,
  ) {
    const item = currentData.inboxItems.find((inboxItem) => inboxItem.id === inboxId);
    if (!item) return currentData;

    const areaId = item.suggestedAreaId || currentData.areas[0]?.id;
    const workspaceId =
      item.suggestedWorkspaceId ||
      currentData.workspaces.find((workspace) => workspace.areaId === areaId)?.id ||
      currentData.workspaces[0]?.id;
    let entityType = target;
    let entityId = inboxId;

    if (target === "task") {
      const { data: task, error } = await this.client
        .from("tasks")
        .insert({
          user_id: this.user.id,
          area_id: areaId,
          workspace_id: workspaceId,
          project_id: item.suggestedProjectId,
          title: item.title,
          description: item.body,
          status: "backlog",
          priority: "medium",
          estimated_minutes: 30,
          sort_order: currentData.tasks.length + 1,
          labels: [item.type],
          source: "manual",
        })
        .select("id")
        .single();
      if (error) throw error;
      entityId = task.id;
    }

    if (target === "project") {
      const { data: project, error } = await this.client
        .from("projects")
        .insert({
          user_id: this.user.id,
          area_id: areaId,
          workspace_id: workspaceId,
          name: item.title,
          description: item.body,
          goal: item.body || `Resolve ${item.title}`,
          status: "planned",
          health: "attention",
          priority: "medium",
          progress_percent: 0,
          start_date: new Date().toISOString().slice(0, 10),
          target_date: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (error) throw error;
      entityId = project.id;
    }

    if (target === "resource") {
      const { data: resource, error } = await this.client
        .from("resources")
        .insert({
          user_id: this.user.id,
          area_id: areaId,
          workspace_id: workspaceId,
          project_id: item.suggestedProjectId,
          title: item.title,
          url: item.sourceUrl || "",
          description: item.body,
          category: item.type === "resource" ? "Other" : "AI / Codex / Claude",
          tags: [item.type],
          source: item.source,
        })
        .select("id")
        .single();
      if (error) throw error;
      entityType = "resource";
      entityId = resource.id;
    }

    const { error: updateError } = await this.client
      .from("inbox_items")
      .update({ status: "converted", reviewed_at: new Date().toISOString() })
      .eq("id", inboxId);
    if (updateError) throw updateError;

    await this.insertActivity(
      entityType,
      entityId,
      "converted",
      `Converted inbox item to ${target}: ${item.title}`,
      { inboxId },
    );

    return this.loadData();
  }

  async upsertDailyPlan(_currentData: AppData, input: DailyPlanInput) {
    const { data, error } = await this.client
      .from("daily_plans")
      .upsert(
        {
          user_id: this.user.id,
          plan_date: input.planDate,
          must_do_task_ids: input.mustDoTaskIds,
          should_do_task_ids: input.shouldDoTaskIds,
          could_do_task_ids: input.couldDoTaskIds,
          notes: input.notes ?? null,
          metadata: {},
        },
        { onConflict: "user_id,plan_date" },
      )
      .select("id")
      .single();
    if (error) throw error;
    await this.insertActivity(
      "daily_plan",
      data.id,
      "saved",
      `Saved daily plan for ${input.planDate}`,
      { plan_date: input.planDate },
    );
    return this.loadData();
  }

  async upsertWeeklyPlan(_currentData: AppData, input: WeeklyPlanInput) {
    const { data, error } = await this.client
      .from("weekly_plans")
      .upsert(
        {
          user_id: this.user.id,
          week_start: input.weekStart,
          outcomes: input.outcomes,
          focus_areas: input.focusAreas,
          open_loops: input.openLoops,
          metadata: {},
        },
        { onConflict: "user_id,week_start" },
      )
      .select("id")
      .single();
    if (error) throw error;
    await this.insertActivity(
      "weekly_plan",
      data.id,
      "saved",
      `Saved weekly plan for week of ${input.weekStart}`,
      { week_start: input.weekStart },
    );
    return this.loadData();
  }

  async appendTaskUpdate(currentData: AppData, taskId: string, body: string) {
    const task = currentData.tasks.find((item) => item.id === taskId);
    const { data, error } = await this.client
      .from("task_updates")
      .insert({
        user_id: this.user.id,
        task_id: taskId,
        update_type: "note",
        body,
        source: "manual",
        metadata: {},
      })
      .select("id")
      .single();
    if (error) throw error;
    await this.insertActivity(
      "task",
      taskId,
      "note_added",
      `Added note to task: ${task?.title || "Untitled task"}`,
      { task_update_id: data.id },
    );
    return this.loadData();
  }

  private async fetchTable(table: string, orderColumn: string, ascending = true) {
    const { data, error } = await this.client
      .from(table)
      .select(selectAll)
      .order(orderColumn, { ascending, nullsFirst: false });

    if (error) throw error;
    return data || [];
  }

  private async insertActivity(
    entityType: string,
    entityId: string,
    eventType: string,
    message: string,
    metadata: Record<string, string | number | boolean | null>,
  ) {
    const { error } = await this.client.from("activity_events").insert({
      user_id: this.user.id,
      entity_type: entityType,
      entity_id: entityId,
      event_type: eventType,
      message,
      metadata,
    });
    if (error) throw error;
  }

}


type DbRow = Record<string, unknown>;


function fnv1a128(value: string) {
  let hash = 0x6c62272e07bb014262b821756295c58dn;
  const prime = 0x0000000001000000000000000000013bn;
  const mask = (1n << 128n) - 1n;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = (hash * prime) & mask;
  }

  return hash.toString(16).padStart(32, "0");
}

const text = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const numberValue = (value: unknown, fallback = 0) =>
  typeof value === "number" ? value : Number(value ?? fallback);

const textArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const metadataValue = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, string | number | boolean>)
    : {};

const mapArea = (row: DbRow): Area => ({
  id: text(row.id),
  name: text(row.name) as Area["name"],
  description: text(row.description),
  color: text(row.color),
  sortOrder: numberValue(row.sort_order),
});

const mapWorkspace = (row: DbRow): Workspace => ({
  id: text(row.id),
  areaId: text(row.area_id),
  name: text(row.name),
  description: text(row.description),
  color: text(row.color),
  sortOrder: numberValue(row.sort_order),
});

const mapProject = (row: DbRow): Project => ({
  id: text(row.id),
  areaId: text(row.area_id),
  workspaceId: text(row.workspace_id),
  name: text(row.name),
  description: text(row.description),
  goal: text(row.goal),
  status: text(row.status) as Project["status"],
  health: text(row.health) as Project["health"],
  priority: text(row.priority) as Project["priority"],
  progressPercent: numberValue(row.progress_percent),
  startDate: text(row.start_date),
  targetDate: text(row.target_date),
});

const mapTask = (row: DbRow): Task => ({
  id: text(row.id),
  areaId: text(row.area_id),
  workspaceId: text(row.workspace_id),
  projectId: text(row.project_id) || undefined,
  parentTaskId: text(row.parent_task_id) || undefined,
  title: text(row.title),
  description: text(row.description),
  status: text(row.status) as Task["status"],
  priority: text(row.priority) as Task["priority"],
  dueDate: text(row.due_date) || undefined,
  scheduledFor: text(row.scheduled_for) || undefined,
  completedAt: text(row.completed_at) || undefined,
  estimatedMinutes: numberValue(row.estimated_minutes),
  sortOrder: numberValue(row.sort_order),
  labels: textArray(row.labels),
  source: text(row.source) as Task["source"],
});

const mapTimeEntry = (row: DbRow): TimeEntry => ({
  id: text(row.id),
  areaId: text(row.area_id),
  workspaceId: text(row.workspace_id),
  projectId: text(row.project_id) || undefined,
  taskId: text(row.task_id) || undefined,
  startedAt: text(row.started_at),
  endedAt: text(row.ended_at) || undefined,
  durationMinutes: numberValue(row.duration_minutes),
  description: text(row.description),
  source: text(row.source) as TimeEntry["source"],
});

const mapInboxItem = (row: DbRow): InboxItem => ({
  id: text(row.id),
  type: text(row.type) as InboxItem["type"],
  title: text(row.title),
  body: text(row.body),
  source: text(row.source),
  sourceUrl: text(row.source_url) || undefined,
  suggestedAreaId: text(row.suggested_area_id) || undefined,
  suggestedWorkspaceId: text(row.suggested_workspace_id) || undefined,
  suggestedProjectId: text(row.suggested_project_id) || undefined,
  suggestedTaskId: text(row.suggested_task_id) || undefined,
  confidence: row.confidence === null ? undefined : Number(row.confidence),
  status: text(row.status) as InboxItem["status"],
  receivedAt: text(row.received_at),
  reviewedAt: text(row.reviewed_at) || undefined,
});

const mapBrainDump = (row: DbRow): BrainDump => ({
  id: text(row.id),
  title: text(row.title),
  body: text(row.body),
  category: text(row.category) as BrainDump["category"],
  status: text(row.status) as BrainDump["status"],
  source: text(row.source),
  convertedTaskId: text(row.converted_task_id) || undefined,
  convertedProjectId: text(row.converted_project_id) || undefined,
});

const mapResource = (row: DbRow): ResourceItem => ({
  id: text(row.id),
  areaId: text(row.area_id) || undefined,
  workspaceId: text(row.workspace_id) || undefined,
  projectId: text(row.project_id) || undefined,
  title: text(row.title),
  url: text(row.url),
  description: text(row.description),
  category: text(row.category),
  tags: textArray(row.tags),
  source: text(row.source),
});

const mapWeeklySnapshot = (row: DbRow): WeeklySnapshot => ({
  id: text(row.id),
  weekStart: text(row.week_start),
  weekEnd: text(row.week_end),
  summary: text(row.summary),
  momentumScore: numberValue(row.momentum_score),
  tasksCompleted: numberValue(row.tasks_completed),
  hoursTracked: numberValue(row.hours_tracked),
  projectsAdvanced: numberValue(row.projects_advanced),
  ideasCaptured: numberValue(row.ideas_captured),
});

const mapActivityEvent = (row: DbRow): ActivityEvent => ({
  id: text(row.id),
  entityType: text(row.entity_type),
  entityId: text(row.entity_id),
  eventType: text(row.event_type),
  message: text(row.message),
  metadata: metadataValue(row.metadata),
  createdAt: text(row.created_at),
});

export const mapTaskUpdate = (row: DbRow): TaskUpdate => ({
  id: text(row.id),
  taskId: text(row.task_id),
  updateType: text(row.update_type) as TaskUpdate["updateType"],
  body: text(row.body),
  source: text(row.source),
  metadata: metadataValue(row.metadata),
  createdAt: text(row.created_at),
});

export const mapDailyPlan = (row: DbRow): DailyPlan => ({
  id: text(row.id),
  planDate: text(row.plan_date),
  mustDoTaskIds: textArray(row.must_do_task_ids),
  shouldDoTaskIds: textArray(row.should_do_task_ids),
  couldDoTaskIds: textArray(row.could_do_task_ids),
  notes: text(row.notes) || undefined,
  generatedBy: text(row.generated_by) || undefined,
  metadata: metadataValue(row.metadata),
  createdAt: text(row.created_at),
  updatedAt: text(row.updated_at),
});

export const mapWeeklyPlan = (row: DbRow): WeeklyPlan => ({
  id: text(row.id),
  weekStart: text(row.week_start),
  outcomes: textArray(row.outcomes),
  focusAreas: textArray(row.focus_areas),
  openLoops: textArray(row.open_loops),
  generatedBy: text(row.generated_by) || undefined,
  metadata: metadataValue(row.metadata),
  createdAt: text(row.created_at),
  updatedAt: text(row.updated_at),
});
