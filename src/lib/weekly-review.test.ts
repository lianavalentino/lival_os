import { describe, it, expect } from "vitest";
import { weeklyReview } from "./weekly-review";
import type { Area, Task, TaskStatus, TimeEntry } from "../types";

const task = (id: string, status: TaskStatus, areaId = "a1"): Task =>
  ({
    id,
    areaId,
    workspaceId: "w1",
    title: `task ${id}`,
    description: "",
    status,
    priority: "medium",
    estimatedMinutes: 30,
    sortOrder: 1,
    labels: [],
    source: "manual",
  }) as Task;

const area = (id: string, name: string): Area =>
  ({ id, name, description: "", color: "#000", sortOrder: 1 }) as Area;

const entry = (startedAt: string, durationMinutes: number): TimeEntry =>
  ({
    id: `e-${startedAt}-${durationMinutes}`,
    areaId: "a1",
    workspaceId: "w1",
    startedAt,
    durationMinutes,
    description: "",
    source: "claude_code",
  }) as TimeEntry;

// Reference week: Mon 2026-07-27 .. Sun 2026-08-02.
const friday = new Date("2026-07-31T17:00:00");

describe("weeklyReview", () => {
  it("computes the PRD's worked example: 3 closed of 6 planned is 50", () => {
    // PRD §12.2 pins this exact case against compute_review.py.
    const tasks = [
      task("1", "done"),
      task("2", "done"),
      task("3", "done"),
      task("4", "this_week"),
      task("5", "in_progress"),
      task("6", "blocked"),
    ];

    const result = weeklyReview({ tasks, timeEntries: [], areas: [] }, friday);

    expect(result.tasksClosed).toBe(3);
    expect(result.tasksPlanned).toBe(6);
    expect(result.momentumScore).toBe(50);
  });

  it("excludes Backlog from planned", () => {
    const tasks = [task("1", "done"), task("2", "backlog"), task("3", "backlog")];

    const result = weeklyReview({ tasks, timeEntries: [], areas: [] }, friday);

    expect(result.tasksPlanned).toBe(1);
    expect(result.momentumScore).toBe(100);
  });

  it("reports zero momentum rather than dividing by zero when nothing is planned", () => {
    const result = weeklyReview(
      { tasks: [task("1", "backlog")], timeEntries: [], areas: [] },
      friday,
    );

    expect(result.tasksPlanned).toBe(0);
    expect(result.momentumScore).toBe(0);
  });

  it("counts only this week's tracked minutes", () => {
    const result = weeklyReview(
      {
        tasks: [],
        areas: [],
        timeEntries: [
          entry("2026-07-28T09:00:00", 120), // in week
          entry("2026-07-20T09:00:00", 600), // previous week
        ],
      },
      friday,
    );

    expect(result.minutesTracked).toBe(120);
  });

  it("names the top area from the live areas table, not a hardcoded list", () => {
    const result = weeklyReview(
      {
        tasks: [task("1", "done", "a2"), task("2", "done", "a2"), task("3", "done", "a1")],
        timeEntries: [],
        areas: [area("a1", "Consulting"), area("a2", "VI")],
      },
      friday,
    );

    expect(result.topArea).toBe("VI");
  });

  it("has no top area when nothing closed", () => {
    const result = weeklyReview(
      { tasks: [task("1", "this_week")], timeEntries: [], areas: [area("a1", "Consulting")] },
      friday,
    );

    expect(result.topArea).toBeUndefined();
  });

  it("keys the snapshot to the Monday of the reference week", () => {
    const result = weeklyReview({ tasks: [], timeEntries: [], areas: [] }, friday);

    expect(result.weekStart).toBe("2026-07-27");
    expect(result.weekEnd).toBe("2026-08-02");
  });
});
