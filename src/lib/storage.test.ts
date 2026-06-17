import { describe, it, expect } from "vitest";
import { seedData } from "../data/seed";
import { normalizeAppData } from "./storage";
import type { AppData } from "../types";

describe("normalizeAppData", () => {
  it("fills missing planning arrays with empty arrays", () => {
    const legacy = { ...seedData } as Partial<AppData>;
    delete legacy.taskUpdates;
    delete legacy.dailyPlans;
    delete legacy.weeklyPlans;

    const result = normalizeAppData(legacy as AppData);

    expect(result.taskUpdates).toEqual([]);
    expect(result.dailyPlans).toEqual([]);
    expect(result.weeklyPlans).toEqual([]);
    expect(result.areas).toBe(seedData.areas);
  });
});

import {
  upsertDailyPlan,
  upsertWeeklyPlan,
  appendTaskUpdate,
} from "./storage";

describe("upsertDailyPlan", () => {
  it("inserts a plan when none exists for the date", () => {
    const base = normalizeAppData(seedData);
    const result = upsertDailyPlan(base, {
      planDate: "2026-06-16",
      mustDoTaskIds: ["t1"],
      shouldDoTaskIds: [],
      couldDoTaskIds: [],
    });
    expect(result.dailyPlans).toHaveLength(1);
    expect(result.dailyPlans[0].planDate).toBe("2026-06-16");
    expect(result.dailyPlans[0].mustDoTaskIds).toEqual(["t1"]);
  });

  it("replaces an existing plan for the same date without duplicating", () => {
    const base = upsertDailyPlan(normalizeAppData(seedData), {
      planDate: "2026-06-16",
      mustDoTaskIds: ["t1"],
      shouldDoTaskIds: [],
      couldDoTaskIds: [],
    });
    const result = upsertDailyPlan(base, {
      planDate: "2026-06-16",
      mustDoTaskIds: ["t2"],
      shouldDoTaskIds: [],
      couldDoTaskIds: [],
    });
    expect(result.dailyPlans).toHaveLength(1);
    expect(result.dailyPlans[0].mustDoTaskIds).toEqual(["t2"]);
  });
});

describe("upsertWeeklyPlan", () => {
  it("replaces an existing plan for the same week without duplicating", () => {
    const base = upsertWeeklyPlan(normalizeAppData(seedData), {
      weekStart: "2026-06-15",
      outcomes: ["a"],
      focusAreas: [],
      openLoops: [],
    });
    const result = upsertWeeklyPlan(base, {
      weekStart: "2026-06-15",
      outcomes: ["b"],
      focusAreas: [],
      openLoops: [],
    });
    expect(result.weeklyPlans).toHaveLength(1);
    expect(result.weeklyPlans[0].outcomes).toEqual(["b"]);
  });
});

describe("appendTaskUpdate", () => {
  it("appends a note update for the task and leaves other arrays untouched", () => {
    const base = normalizeAppData(seedData);
    const result = appendTaskUpdate(base, "task-1", "made progress");
    expect(result.taskUpdates).toHaveLength(1);
    expect(result.taskUpdates[0].taskId).toBe("task-1");
    expect(result.taskUpdates[0].updateType).toBe("note");
    expect(result.taskUpdates[0].body).toBe("made progress");
    expect(result.tasks).toBe(base.tasks);
  });
});
