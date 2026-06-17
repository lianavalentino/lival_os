import { describe, it, expect } from "vitest";
import { mapTaskUpdate, mapDailyPlan, mapWeeklyPlan } from "./repository";

describe("mapTaskUpdate", () => {
  it("maps snake_case row to camelCase", () => {
    const result = mapTaskUpdate({
      id: "u1",
      task_id: "t1",
      update_type: "note",
      body: "did the thing",
      source: "manual",
      metadata: { k: "v" },
      created_at: "2026-06-16T00:00:00Z",
    });
    expect(result).toEqual({
      id: "u1",
      taskId: "t1",
      updateType: "note",
      body: "did the thing",
      source: "manual",
      metadata: { k: "v" },
      createdAt: "2026-06-16T00:00:00Z",
    });
  });
});

describe("mapDailyPlan", () => {
  it("coerces array columns and nullable fields", () => {
    const result = mapDailyPlan({
      id: "d1",
      plan_date: "2026-06-16",
      must_do_task_ids: ["t1", "t2"],
      should_do_task_ids: [],
      could_do_task_ids: ["t3"],
      notes: null,
      generated_by: null,
      metadata: {},
      created_at: "2026-06-16T00:00:00Z",
      updated_at: "2026-06-16T00:00:00Z",
    });
    expect(result.mustDoTaskIds).toEqual(["t1", "t2"]);
    expect(result.shouldDoTaskIds).toEqual([]);
    expect(result.couldDoTaskIds).toEqual(["t3"]);
    expect(result.notes).toBeUndefined();
    expect(result.generatedBy).toBeUndefined();
    expect(result.planDate).toBe("2026-06-16");
  });
});

describe("mapWeeklyPlan", () => {
  it("coerces array columns", () => {
    const result = mapWeeklyPlan({
      id: "w1",
      week_start: "2026-06-15",
      outcomes: ["ship it"],
      focus_areas: ["Build Lab"],
      open_loops: [],
      generated_by: null,
      metadata: {},
      created_at: "2026-06-15T00:00:00Z",
      updated_at: "2026-06-15T00:00:00Z",
    });
    expect(result.weekStart).toBe("2026-06-15");
    expect(result.outcomes).toEqual(["ship it"]);
    expect(result.focusAreas).toEqual(["Build Lab"]);
    expect(result.openLoops).toEqual([]);
  });
});
