import { addDays, format, startOfWeek } from "date-fns";
import type { Area, Task, TaskStatus, TimeEntry } from "../types";
import { weeklyTime } from "./metrics";

/**
 * The Friday weekly review rollup (PRD §12.2), as a pure function.
 *
 * This is the math the `lival-weekly-review-friday` job has always run; it used
 * to read and write Notion against a hardcoded five-area list. Areas now come
 * from the live table, which is the one behavioural change the port requires —
 * the list was already missing Learning and is wrong in a new way after the
 * §6.2 area reset.
 *
 * Backlog is excluded from "planned" on purpose: a backlog that grows faster
 * than you close it would otherwise drive the score to zero and make the number
 * meaningless.
 */

const PLANNED_STATUSES: TaskStatus[] = ["this_week", "in_progress", "blocked", "done"];

export type WeeklyReview = {
  weekStart: string;
  weekEnd: string;
  tasksClosed: number;
  tasksPlanned: number;
  momentumScore: number;
  minutesTracked: number;
  topArea?: string;
};

export function weeklyReview(
  data: { tasks: Task[]; timeEntries: TimeEntry[]; areas: Area[] },
  reference: Date,
): WeeklyReview {
  const start = startOfWeek(reference, { weekStartsOn: 1 });

  const closed = data.tasks.filter((task) => task.status === "done");
  const planned = data.tasks.filter((task) => PLANNED_STATUSES.includes(task.status));

  const closedByArea = new Map<string, number>();
  for (const task of closed) {
    closedByArea.set(task.areaId, (closedByArea.get(task.areaId) ?? 0) + 1);
  }

  const topAreaId = [...closedByArea.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    weekStart: format(start, "yyyy-MM-dd"),
    weekEnd: format(addDays(start, 6), "yyyy-MM-dd"),
    tasksClosed: closed.length,
    tasksPlanned: planned.length,
    momentumScore: planned.length ? Math.round((closed.length / planned.length) * 100) : 0,
    minutesTracked: weeklyTime(data.timeEntries, reference).totalMinutes,
    topArea: data.areas.find((area) => area.id === topAreaId)?.name,
  };
}
