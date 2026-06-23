import {
  Archive,
  BarChart3,
  Brain,
  CalendarDays,
  FolderKanban,
  Home,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Link2,
  Settings,
  Target,
} from "lucide-react";
import type { AppData, Task, TaskStatus, ViewKey } from "../types";

export const navItems: Array<{ key: ViewKey; label: string; icon: typeof Home }> = [
  { key: "command", label: "Command", icon: LayoutDashboard },
  { key: "daily", label: "Daily", icon: CalendarDays },
  { key: "weekly", label: "Weekly", icon: Target },
  { key: "board", label: "Board", icon: KanbanSquare },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "brain-dump", label: "Brain Dump", icon: Brain },
  { key: "resources", label: "Resources", icon: Link2 },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "archive", label: "Archive", icon: Archive },
  { key: "settings", label: "Settings", icon: Settings },
];

export const bottomNav = navItems.filter((item) =>
  ["command", "board", "projects", "inbox"].includes(item.key),
);

export const statusOrder: TaskStatus[] = [
  "backlog",
  "this_week",
  "in_progress",
  "blocked",
  "done",
];

export const statusTone: Record<TaskStatus, string> = {
  backlog: "neutral",
  this_week: "yellow",
  in_progress: "blue",
  blocked: "red",
  done: "green",
};

export function viewTitle(view: ViewKey) {
  const titles: Record<ViewKey, string> = {
    command: "Command Center",
    daily: "Daily Planner",
    weekly: "Weekly Planner",
    board: "Board",
    projects: "Projects",
    "project-detail": "Project Detail",
    "task-detail": "Task Detail",
    inbox: "Inbox",
    "brain-dump": "Brain Dump",
    resources: "Resources",
    reports: "Reports",
    archive: "Archive",
    settings: "Settings",
  };
  return titles[view];
}

export function viewSubtitle(view: ViewKey) {
  const subtitles: Record<ViewKey, string> = {
    command: "Top priorities, review queues, progress, and time in one scan.",
    daily: "Must do, should do, could do, schedule, and unplanned items.",
    weekly: "Outcomes, focus areas, project priorities, and open loops.",
    board: "All active tasks grouped by workflow status.",
    projects: "Portfolio grouped by area with health and progress.",
    "project-detail": "Progress, tasks, time, resources, notes, and activity.",
    "task-detail": "Task context, status, subtasks, notes, and activity.",
    inbox: "Captured items waiting for review or conversion.",
    "brain-dump": "Low-pressure space for ideas, thoughts, and someday items.",
    resources: "Reference library for tools, clients, learning, and life admin.",
    reports: "Weekly accomplishment evidence and momentum signals.",
    archive: "Completed snapshots and historical reports.",
    settings: "Private app status, persistence, and future automation hooks.",
  };
  return subtitles[view];
}

export function lookupWorkspace(data: AppData, id?: string) {
  return data.workspaces.find((workspace) => workspace.id === id);
}

export function lookupProject(data: AppData, id?: string) {
  return data.projects.find((project) => project.id === id);
}

export function priorityRank(priority: Task["priority"]) {
  return { high: 0, medium: 1, low: 2 }[priority];
}
