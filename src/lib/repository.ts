import type { SupabaseClient, User } from "@supabase/supabase-js";
import { seedData } from "../data/seed";
import {
  ActivityEvent,
  AppData,
  Area,
  BrainDump,
  CaptureDraft,
  InboxItem,
  Project,
  ResourceItem,
  Task,
  TimeEntry,
  WeeklySnapshot,
  Workspace,
} from "../types";
import {
  convertInboxItem as convertLocalInboxItem,
  createCapture as createLocalCapture,
  loadLocalData,
  resetLocalData,
  saveLocalData,
  updateInboxStatus as updateLocalInboxStatus,
  updateTaskStatus as updateLocalTaskStatus,
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

    if (shouldRunSeedRepair()) {
      await this.repairSeedData();
      markSeedRepairComplete();
    }

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
      taskUpdates: [],
      dailyPlans: [],
      weeklyPlans: [],
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

  private async repairSeedData() {
    await this.bootstrapSeedData();
    await this.deleteDuplicateSeedRows();
  }

  private async bootstrapSeedData() {
    const userId = this.user.id;
    const seedRowId = createSeedRowIdGetter(userId);

    await insertMissingSeedRows(
      this.client,
      "areas",
      seedData.areas.map((area) => ({
        id: seedRowId(area.id),
        user_id: userId,
        name: area.name,
        description: area.description,
        color: area.color,
        sort_order: area.sortOrder,
      })),
    );

    await insertMissingSeedRows(
      this.client,
      "workspaces",
      seedData.workspaces.map((workspace) => ({
        id: seedRowId(workspace.id),
        user_id: userId,
        area_id: seedRowId(workspace.areaId),
        name: workspace.name,
        description: workspace.description,
        color: workspace.color,
        sort_order: workspace.sortOrder,
      })),
    );

    await insertMissingSeedRows(
      this.client,
      "projects",
      seedData.projects.map((project) => ({
        id: seedRowId(project.id),
        user_id: userId,
        area_id: seedRowId(project.areaId),
        workspace_id: seedRowId(project.workspaceId),
        name: project.name,
        description: project.description,
        goal: project.goal,
        status: project.status,
        health: project.health,
        priority: project.priority,
        progress_percent: project.progressPercent,
        start_date: project.startDate,
        target_date: project.targetDate,
      })),
    );

    await insertMissingSeedRows(
      this.client,
      "tasks",
      seedData.tasks.map((task) => ({
        id: seedRowId(task.id),
        user_id: userId,
        area_id: seedRowId(task.areaId),
        workspace_id: seedRowId(task.workspaceId),
        project_id: task.projectId ? seedRowId(task.projectId) : null,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.dueDate,
        scheduled_for: task.scheduledFor,
        completed_at: task.completedAt,
        estimated_minutes: task.estimatedMinutes,
        sort_order: task.sortOrder,
        labels: task.labels,
        source: task.source,
      })),
    );

    await insertMissingSeedRows(
      this.client,
      "time_entries",
      seedData.timeEntries.map((entry) => ({
        id: seedRowId(entry.id),
        user_id: userId,
        area_id: seedRowId(entry.areaId),
        workspace_id: seedRowId(entry.workspaceId),
        project_id: entry.projectId ? seedRowId(entry.projectId) : null,
        task_id: entry.taskId ? seedRowId(entry.taskId) : null,
        started_at: entry.startedAt,
        ended_at: entry.endedAt,
        duration_minutes: entry.durationMinutes,
        description: entry.description,
        source: entry.source,
      })),
    );

    await insertMissingSeedRows(
      this.client,
      "inbox_items",
      seedData.inboxItems.map((item) => ({
        id: seedRowId(item.id),
        user_id: userId,
        type: item.type,
        title: item.title,
        body: item.body,
        source: item.source,
        source_url: item.sourceUrl,
        suggested_area_id: item.suggestedAreaId ? seedRowId(item.suggestedAreaId) : null,
        suggested_workspace_id: item.suggestedWorkspaceId
          ? seedRowId(item.suggestedWorkspaceId)
          : null,
        suggested_project_id: item.suggestedProjectId ? seedRowId(item.suggestedProjectId) : null,
        suggested_task_id: item.suggestedTaskId ? seedRowId(item.suggestedTaskId) : null,
        confidence: item.confidence,
        status: item.status,
        received_at: item.receivedAt,
        reviewed_at: item.reviewedAt,
      })),
    );

    await insertMissingSeedRows(
      this.client,
      "brain_dumps",
      seedData.brainDumps.map((entry) => ({
        id: seedRowId(entry.id),
        user_id: userId,
        title: entry.title,
        body: entry.body,
        category: entry.category,
        status: entry.status,
        source: entry.source,
      })),
    );

    await insertMissingSeedRows(
      this.client,
      "resources",
      seedData.resources.map((resource) => ({
        id: seedRowId(resource.id),
        user_id: userId,
        area_id: resource.areaId ? seedRowId(resource.areaId) : null,
        workspace_id: resource.workspaceId ? seedRowId(resource.workspaceId) : null,
        project_id: resource.projectId ? seedRowId(resource.projectId) : null,
        title: resource.title,
        url: resource.url,
        description: resource.description,
        category: resource.category,
        tags: resource.tags,
        source: resource.source,
      })),
    );

    await insertMissingWeeklySnapshots(
      this.client,
      seedData.weeklySnapshots.map((snapshot) => ({
        id: seedRowId(snapshot.id),
        user_id: userId,
        week_start: snapshot.weekStart,
        week_end: snapshot.weekEnd,
        summary: snapshot.summary,
        momentum_score: snapshot.momentumScore,
        tasks_completed: snapshot.tasksCompleted,
        hours_tracked: snapshot.hoursTracked,
        projects_advanced: snapshot.projectsAdvanced,
        ideas_captured: snapshot.ideasCaptured,
        snapshot_json: {},
      })),
    );

    await insertMissingSeedRows(
      this.client,
      "activity_events",
      seedData.activityEvents.map((event) => ({
        id: seedRowId(event.id),
        user_id: userId,
        entity_type: event.entityType,
        entity_id: seedRowId(event.entityId),
        event_type: event.eventType,
        message: event.message,
        metadata: event.metadata,
        created_at: event.createdAt,
      })),
    );
  }

  private async deleteDuplicateSeedRows() {
    const userId = this.user.id;
    const seedRowId = createSeedRowIdGetter(userId);
    const canonicalIds = new Set(seedClientIds.map(seedRowId));

    await this.deleteMatchingSeedDuplicates(
      "activity_events",
      "id, entity_type, event_type, message",
      seedData.activityEvents,
      (row, event) =>
        text(row.entity_type) === event.entityType &&
        text(row.event_type) === event.eventType &&
        text(row.message) === event.message,
      canonicalIds,
    );
    await this.deleteMatchingSeedDuplicates(
      "resources",
      "id, title, url, source",
      seedData.resources,
      (row, resource) =>
        text(row.title) === resource.title &&
        text(row.url) === resource.url &&
        text(row.source) === resource.source,
      canonicalIds,
    );
    await this.deleteMatchingSeedDuplicates(
      "time_entries",
      "id, duration_minutes, description, source",
      seedData.timeEntries,
      (row, entry) =>
        numberValue(row.duration_minutes) === entry.durationMinutes &&
        text(row.description) === entry.description &&
        text(row.source) === entry.source,
      canonicalIds,
    );
    await this.deleteMatchingSeedDuplicates(
      "inbox_items",
      "id, type, title, source",
      seedData.inboxItems,
      (row, item) =>
        text(row.type) === item.type &&
        text(row.title) === item.title &&
        text(row.source) === item.source,
      canonicalIds,
    );
    await this.deleteMatchingSeedDuplicates(
      "brain_dumps",
      "id, title, category, source",
      seedData.brainDumps,
      (row, entry) =>
        text(row.title) === entry.title &&
        text(row.category) === entry.category &&
        text(row.source) === entry.source,
      canonicalIds,
    );
    await this.deleteMatchingSeedDuplicates(
      "tasks",
      "id, title, source, sort_order",
      seedData.tasks,
      (row, task) =>
        text(row.title) === task.title &&
        text(row.source) === task.source &&
        numberValue(row.sort_order) === task.sortOrder,
      canonicalIds,
    );
    await this.deleteMatchingSeedDuplicates(
      "projects",
      "id, name, goal, priority",
      seedData.projects,
      (row, project) =>
        text(row.name) === project.name &&
        text(row.goal) === project.goal &&
        text(row.priority) === project.priority,
      canonicalIds,
    );
    await this.deleteMatchingSeedDuplicates(
      "workspaces",
      "id, name, description, sort_order",
      seedData.workspaces,
      (row, workspace) =>
        text(row.name) === workspace.name &&
        text(row.description) === workspace.description &&
        numberValue(row.sort_order) === workspace.sortOrder,
      canonicalIds,
    );
    await this.deleteMatchingSeedDuplicates(
      "areas",
      "id, name, description, sort_order",
      seedData.areas,
      (row, area) =>
        text(row.name) === area.name &&
        text(row.description) === area.description &&
        numberValue(row.sort_order) === area.sortOrder,
      canonicalIds,
    );
  }

  private async deleteMatchingSeedDuplicates<TSeed>(
    table: string,
    selectColumns: string,
    seeds: TSeed[],
    matchesSeed: (row: DbRow, seed: TSeed) => boolean,
    canonicalIds: Set<string>,
  ) {
    const { data, error } = await this.client
      .from(table)
      .select(selectColumns)
      .eq("user_id", this.user.id);
    if (error) throw error;

    const rows = (data || []) as unknown as DbRow[];
    const duplicateIds = rows
      .filter((row) => {
        const id = text(row.id);
        return id && !canonicalIds.has(id) && seeds.some((seed) => matchesSeed(row, seed));
      })
      .map((row) => text(row.id));

    if (!duplicateIds.length) return;

    const { error: deleteError } = await this.client.from(table).delete().in("id", duplicateIds);
    if (deleteError) throw deleteError;
  }
}

async function insertMissingSeedRows(
  client: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
) {
  if (!rows.length) return [];
  const { data, error } = await client
    .from(table)
    .upsert(rows, { ignoreDuplicates: true, onConflict: "id" })
    .select("id");
  if (error) throw error;
  return data || [];
}

type DbRow = Record<string, unknown>;

const seedRepairSessionKey = "lival_os_seed_repair_v2_complete";

const seedClientIds = [
  ...seedData.areas,
  ...seedData.workspaces,
  ...seedData.projects,
  ...seedData.tasks,
  ...seedData.timeEntries,
  ...seedData.inboxItems,
  ...seedData.brainDumps,
  ...seedData.resources,
  ...seedData.weeklySnapshots,
  ...seedData.activityEvents,
].map((item) => item.id);

function createSeedRowIdGetter(userId: string) {
  const idMap = new Map(seedClientIds.map((id) => [id, deterministicSeedId(userId, id)]));
  return (id: string) => {
    const value = idMap.get(id);
    if (!value) throw new Error(`Missing seed ID for ${id}`);
    return value;
  };
}

function shouldRunSeedRepair() {
  try {
    return globalThis.sessionStorage?.getItem(seedRepairSessionKey) !== "true";
  } catch {
    return true;
  }
}

function markSeedRepairComplete() {
  try {
    globalThis.sessionStorage?.setItem(seedRepairSessionKey, "true");
  } catch {
    // If browser storage is unavailable, keep the repair path conservative on the next load.
  }
}

async function insertMissingWeeklySnapshots(
  client: SupabaseClient,
  rows: Record<string, unknown>[],
) {
  if (!rows.length) return [];
  const weekStarts = rows.map((row) => text(row.week_start)).filter(Boolean);
  const { data: existing, error: selectError } = await client
    .from("weekly_snapshots")
    .select("week_start")
    .in("week_start", weekStarts);
  if (selectError) throw selectError;

  const existingWeeks = new Set((existing || []).map((row) => text(row.week_start)));
  return insertMissingSeedRows(
    client,
    "weekly_snapshots",
    rows.filter((row) => !existingWeeks.has(text(row.week_start))),
  );
}

function deterministicSeedId(userId: string, seedId: string) {
  const hash = fnv1a128(`${userId}:${seedId}`);
  const variant = ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(
    13,
    16,
  )}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

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
