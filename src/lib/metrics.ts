import { addDays, startOfWeek } from "date-fns";
import { AppData, TaskStatus, TimeEntry } from "../types";

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

const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Minutes logged in the week containing `reference`, bucketed Monday-first.
 * Entries outside that week are excluded — the sidebar card claims "this week"
 * and must not quietly show all time ever recorded.
 */
export const weeklyTime = (entries: TimeEntry[], reference: Date) => {
  const start = startOfWeek(reference, { weekStartsOn: 1 });
  const end = addDays(start, 7);

  const minutes = new Array(7).fill(0);

  for (const entry of entries) {
    const startedAt = new Date(entry.startedAt);
    if (startedAt < start || startedAt >= end) continue;
    const dayIndex = Math.floor(
      (startedAt.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
    );
    minutes[dayIndex] += entry.durationMinutes;
  }

  return {
    days: weekdayLabels.map((label, index) => ({ label, minutes: minutes[index] })),
    totalMinutes: minutes.reduce((sum: number, value: number) => sum + value, 0),
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
