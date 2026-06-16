import { AppData, TaskStatus } from "../types";

export const taskStatusLabels: Record<TaskStatus, string> = {
  backlog: "Backlog",
  this_week: "This Week",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

export const minutesToHours = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

export const dashboardMetrics = (data: AppData) => {
  const completed = data.tasks.filter((task) => task.status === "done");
  const active = data.tasks.filter((task) => task.status !== "done");
  const blocked = data.tasks.filter((task) => task.status === "blocked");
  const highPriority = active.filter((task) => task.priority === "high");
  const totalMinutes = data.timeEntries.reduce(
    (sum, entry) => sum + entry.durationMinutes,
    0,
  );
  const newInbox = data.inboxItems.filter((item) => item.status === "new");
  const activeProjects = data.projects.filter((project) => project.status === "active");

  return {
    completedCount: completed.length,
    activeCount: active.length,
    blockedCount: blocked.length,
    highPriorityCount: highPriority.length,
    totalMinutes,
    newInboxCount: newInbox.length,
    activeProjectsCount: activeProjects.length,
    ideasCaptured: data.brainDumps.filter((entry) => entry.status === "captured").length,
  };
};

export const tasksByStatus = (data: AppData) =>
  (Object.keys(taskStatusLabels) as TaskStatus[]).map((status) => ({
    status,
    label: taskStatusLabels[status],
    tasks: data.tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));

export const projectTime = (data: AppData, projectId: string) =>
  data.timeEntries
    .filter((entry) => entry.projectId === projectId)
    .reduce((sum, entry) => sum + entry.durationMinutes, 0);
