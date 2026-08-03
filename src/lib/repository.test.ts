import { describe, it, expect } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  SupabaseRepository,
  mapTaskUpdate,
  mapDailyPlan,
  mapWeeklyPlan,
} from "./repository";

/**
 * Records every operation issued against the Supabase client so a test can assert
 * on what loadData() did to the database, not on how it was structured internally.
 * Faked because it is a system boundary; nothing internal is mocked.
 */
function createRecordingClient(rowsByTable: Record<string, unknown[]> = {}) {
  const ops: { table: string; op: string }[] = [];

  const from = (table: string) => {
    const record = (op: string) => {
      ops.push({ table, op });
      return chain;
    };
    const chain = {
      select: () => record("select"),
      insert: () => record("insert"),
      upsert: () => record("upsert"),
      update: () => record("update"),
      delete: () => record("delete"),
      order: () => chain,
      eq: () => chain,
      in: () => chain,
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: rowsByTable[table] ?? [], error: null }).then(resolve),
    };
    return chain;
  };

  return { client: { from } as unknown as SupabaseClient, ops };
}

const testUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "liana@example.com",
  user_metadata: {},
} as unknown as User;

describe("SupabaseRepository.loadData", () => {
  it("does not write to content tables", async () => {
    const { client, ops } = createRecordingClient();

    await new SupabaseRepository(client, testUser).loadData();

    // profiles is upserted on purpose — that is the signed-in user's own row,
    // not seed content. Everything else must be read-only on load.
    const contentWrites = ops.filter((o) => o.op !== "select" && o.table !== "profiles");
    expect(contentWrites).toEqual([]);
  });

  it("returns the areas the database holds", async () => {
    const { client } = createRecordingClient({
      areas: [
        {
          id: "area-consulting",
          name: "Consulting",
          description: "Client work",
          color: "#8b5cf6",
          sort_order: 1,
        },
      ],
    });

    const data = await new SupabaseRepository(client, testUser).loadData();

    expect(data.areas).toEqual([
      {
        id: "area-consulting",
        name: "Consulting",
        description: "Client work",
        color: "#8b5cf6",
        sortOrder: 1,
      },
    ]);
  });
});

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
