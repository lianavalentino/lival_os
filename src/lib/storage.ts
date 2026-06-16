import { AppData, CaptureDraft, InboxItem, ResourceItem, Task } from "../types";
import { seedData } from "../data/seed";

const STORAGE_KEY = "lival-os-demo-data:v2";

const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const loadLocalData = (): AppData => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedData;
    return JSON.parse(raw) as AppData;
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Local demo mode should never break app startup.
    }
    return seedData;
  }
};

export const saveLocalData = (data: AppData) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Demo persistence can fail in private browsing or quota-restricted contexts.
  }
};

export const resetLocalData = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // No-op when storage is unavailable.
  }
};

export const createCapture = (draft: CaptureDraft, data: AppData): AppData => {
  const areaId = draft.areaId || data.areas[0]?.id;
  const workspaceId =
    data.workspaces.find((workspace) => workspace.areaId === areaId)?.id ||
    data.workspaces[0]?.id;
  const timestamp = new Date().toISOString();

  if (draft.type === "task") {
    const task: Task = {
      id: makeId("task"),
      areaId,
      workspaceId,
      title: draft.title.trim(),
      description: draft.body.trim(),
      status: "backlog",
      priority: "medium",
      estimatedMinutes: 30,
      sortOrder: data.tasks.length + 1,
      labels: ["capture"],
      source: "manual",
    };

    return {
      ...data,
      tasks: [task, ...data.tasks],
      activityEvents: [
        {
          id: makeId("event"),
          entityType: "task",
          entityId: task.id,
          eventType: "captured",
          message: `Captured task: ${task.title}`,
          metadata: { source: "quick_capture" },
          createdAt: timestamp,
        },
        ...data.activityEvents,
      ],
    };
  }

  if (draft.type === "brain") {
    const entry = {
      id: makeId("brain"),
      title: draft.title.trim(),
      body: draft.body.trim(),
      category: "idea" as const,
      status: "captured" as const,
      source: "quick capture",
    };

    return {
      ...data,
      brainDumps: [entry, ...data.brainDumps],
      activityEvents: [
        {
          id: makeId("event"),
          entityType: "brain_dump",
          entityId: entry.id,
          eventType: "captured",
          message: `Captured idea: ${entry.title}`,
          metadata: { source: "quick_capture" },
          createdAt: timestamp,
        },
        ...data.activityEvents,
      ],
    };
  }

  const inbox: InboxItem = {
    id: makeId("inbox"),
    type: draft.type,
    title: draft.title.trim(),
    body: draft.body.trim(),
    source: "quick capture",
    suggestedAreaId: areaId,
    suggestedWorkspaceId: workspaceId,
    confidence: 0.7,
    status: "new",
    receivedAt: timestamp,
  };

  return {
    ...data,
    inboxItems: [inbox, ...data.inboxItems],
    activityEvents: [
      {
        id: makeId("event"),
        entityType: "inbox_item",
        entityId: inbox.id,
        eventType: "captured",
        message: `Captured inbox item: ${inbox.title}`,
        metadata: { type: inbox.type },
        createdAt: timestamp,
      },
      ...data.activityEvents,
    ],
  };
};

export const updateTaskStatus = (
  data: AppData,
  taskId: string,
  status: Task["status"],
): AppData => ({
  ...data,
  tasks: data.tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          status,
          completedAt: status === "done" ? new Date().toISOString().slice(0, 10) : undefined,
        }
      : task,
  ),
});

export const updateInboxStatus = (
  data: AppData,
  inboxId: string,
  status: InboxItem["status"],
): AppData => ({
  ...data,
  inboxItems: data.inboxItems.map((item) =>
    item.id === inboxId
      ? {
          ...item,
          status,
          reviewedAt:
            status === "reviewed" || status === "converted" || status === "archived"
              ? new Date().toISOString()
              : item.reviewedAt,
        }
      : item,
  ),
});

export const convertInboxItem = (
  data: AppData,
  inboxId: string,
  target: "task" | "project" | "resource",
): AppData => {
  const item = data.inboxItems.find((inboxItem) => inboxItem.id === inboxId);
  if (!item) return data;

  const areaId = item.suggestedAreaId || data.areas[0]?.id;
  const workspaceId =
    item.suggestedWorkspaceId ||
    data.workspaces.find((workspace) => workspace.areaId === areaId)?.id ||
    data.workspaces[0]?.id;
  const timestamp = new Date().toISOString();
  const nextData = updateInboxStatus(data, inboxId, "converted");

  if (target === "task") {
    const task: Task = {
      id: makeId("task"),
      areaId,
      workspaceId,
      projectId: item.suggestedProjectId,
      title: item.title,
      description: item.body,
      status: "backlog",
      priority: "medium",
      estimatedMinutes: 30,
      sortOrder: data.tasks.length + 1,
      labels: [item.type],
      source: "manual",
    };

    return {
      ...nextData,
      tasks: [task, ...nextData.tasks],
      activityEvents: [
        {
          id: makeId("event"),
          entityType: "task",
          entityId: task.id,
          eventType: "converted",
          message: `Converted inbox item to task: ${task.title}`,
          metadata: { inboxId },
          createdAt: timestamp,
        },
        ...nextData.activityEvents,
      ],
    };
  }

  if (target === "project") {
    const project = {
      id: makeId("project"),
      areaId,
      workspaceId,
      name: item.title,
      description: item.body,
      goal: item.body || `Resolve ${item.title}`,
      status: "planned" as const,
      health: "attention" as const,
      priority: "medium" as const,
      progressPercent: 0,
      startDate: new Date().toISOString().slice(0, 10),
      targetDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
    };

    return {
      ...nextData,
      projects: [project, ...nextData.projects],
      activityEvents: [
        {
          id: makeId("event"),
          entityType: "project",
          entityId: project.id,
          eventType: "converted",
          message: `Converted inbox item to project: ${project.name}`,
          metadata: { inboxId },
          createdAt: timestamp,
        },
        ...nextData.activityEvents,
      ],
    };
  }

  const resource: ResourceItem = {
    id: makeId("resource"),
    areaId,
    workspaceId,
    projectId: item.suggestedProjectId,
    title: item.title,
    url: item.sourceUrl || "",
    description: item.body,
    category: item.type === "resource" ? "Other" : "AI / Codex / Claude",
    tags: [item.type],
    source: item.source,
  };

  return {
    ...nextData,
    resources: [resource, ...nextData.resources],
    activityEvents: [
      {
        id: makeId("event"),
        entityType: "resource",
        entityId: resource.id,
        eventType: "converted",
        message: `Converted inbox item to resource: ${resource.title}`,
        metadata: { inboxId },
        createdAt: timestamp,
      },
      ...nextData.activityEvents,
    ],
  };
};
