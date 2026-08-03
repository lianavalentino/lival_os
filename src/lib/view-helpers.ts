import {
  Archive,
  BarChart3,
  CalendarDays,
  FolderKanban,
  Home,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Lightbulb,
  Settings,
  Target,
} from "lucide-react";
import type { AppData, Task, TaskStatus, ViewKey } from "../types";

export type NavItem = { key: ViewKey; label: string; icon: typeof Home };

/**
 * Sidebar composition per PRD §7.0. Project Detail and Task Detail are drill-ins,
 * not nav entries, and are deliberately absent.
 */
export const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Now",
    items: [
      { key: "command", label: "Command Center", icon: LayoutDashboard },
      { key: "daily", label: "Daily", icon: CalendarDays },
      { key: "weekly", label: "Weekly", icon: Target },
    ],
  },
  {
    label: "Work",
    items: [
      { key: "board", label: "Board", icon: KanbanSquare },
      { key: "projects", label: "Projects", icon: FolderKanban },
      { key: "inbox", label: "Inbox", icon: Inbox },
      { key: "brain", label: "Brain", icon: Lightbulb },
    ],
  },
  {
    label: "Review",
    items: [
      { key: "reports", label: "Reports", icon: BarChart3 },
      { key: "archive", label: "Archive", icon: Archive },
      { key: "settings", label: "Settings", icon: Settings },
    ],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

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
    brain: "Brain",
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
    brain: "Ideas, someday items, and the saved reference library.",
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
