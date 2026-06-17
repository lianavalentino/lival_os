# Phase 2 — Planning Tables Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load `task_updates` / `daily_plans` / `weekly_plans` into `AppData` and add minimal read+write wiring so the existing Daily Planner, Weekly Planner, and Task Detail views persist and read back real Supabase rows.

**Architecture:** Additive only. New camelCase types extend `AppData`; both repositories (`SupabaseRepository`, `LocalDemoRepository`) gain three load mappers and three mutation methods; the existing planner/task-detail views get a single "save" affordance each (Approach A — snapshot-then-persist). Pure functions (mappers + demo helpers) are covered by a new vitest harness; UI is verified via build + manual smoke.

**Tech Stack:** Vite + React 19 + TypeScript, `@supabase/supabase-js` v2, date-fns v4, vitest (new dev dependency).

**Spec:** `docs/superpowers/specs/2026-06-16-phase2-planning-tables-wiring-design.md`

## Global Constraints

- Stay on Vite + React 19 + TypeScript SPA. No Next.js, Tailwind, shadcn/ui.
- Additive only: do NOT modify any existing table, column, type field, or existing `mapX`/mutation. No new views/routes.
- New DB columns are snake_case; TypeScript types are camelCase. Map with existing helpers: `text()`, `numberValue()`, `textArray()`, `metadataValue()`.
- Upserts rely on migration 002 unique constraints: `daily_plans (user_id, plan_date)`, `weekly_plans (user_id, week_start)` — already applied + verified live.
- Demo IDs use the existing `makeId(prefix)` generator in `src/lib/storage.ts`.
- Each Supabase mutation calls `insertActivity(...)` then `loadData()` — same contract as `updateTaskStatus`.
- `tsc -b` includes `src`; test files (`src/**/*.test.ts`) are excluded from the build and owned by vitest.
- Verification per task: `npm run lint` (exits 0), `npm run build` (`tsc -b && vite build`, exits 0), `npm test` where tests exist.

---

### Task 1: Set up vitest harness

**Files:**
- Modify: `package.json` (scripts + devDependencies)
- Create: `vitest.config.ts`
- Modify: `tsconfig.app.json` (exclude test files from build)
- Create: `src/sanity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test` command (`vitest run`) that discovers `src/**/*.test.ts`, used by all later tasks.

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest`
Expected: `vitest` added under devDependencies, exits 0.

- [ ] **Step 2: Add the test script**

In `package.json`, add a `test` script. The `scripts` block becomes:

```json
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Create the vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Exclude test files from the TypeScript build**

In `tsconfig.app.json`, add an `exclude` key alongside `include` so `tsc -b` does not typecheck test files (vitest owns them). The file's last two keys become:

```json
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
```

- [ ] **Step 5: Write a sanity test**

Create `src/sanity.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("vitest harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run the test to confirm the harness works**

Run: `npm test`
Expected: 1 passed (`src/sanity.test.ts`), exits 0.

- [ ] **Step 7: Confirm the build still passes**

Run: `npm run build`
Expected: exits 0 (test file excluded, no typecheck pickup).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tsconfig.app.json src/sanity.test.ts
git commit -m "test: add vitest harness for pure-function tests"
```

---

### Task 2: Add types, extend AppData, seed empties, and demo normalize

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/seed.ts`
- Modify: `src/lib/storage.ts`
- Modify: `src/lib/repository.ts:151-162` (loadData return — temporary empty stubs)
- Create: `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `TaskUpdate`, `DailyPlan`, `WeeklyPlan`, `TaskUpdateType`, `DailyPlanInput`, `WeeklyPlanInput` types.
  - `AppData` now requires `taskUpdates: TaskUpdate[]`, `dailyPlans: DailyPlan[]`, `weeklyPlans: WeeklyPlan[]`.
  - `normalizeAppData(data: AppData): AppData` exported from `src/lib/storage.ts`.

- [ ] **Step 1: Write the failing test for normalizeAppData**

Create `src/lib/storage.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `normalizeAppData` is not exported from `./storage` (and the new `AppData` fields don't exist yet).

- [ ] **Step 3: Add the new types and extend AppData**

In `src/types.ts`, add these type declarations immediately above the `export interface AppData {` block:

```ts
export type TaskUpdateType =
  | "note"
  | "status_change"
  | "time_logged"
  | "file_change"
  | "system";

export interface TaskUpdate {
  id: string;
  taskId: string;
  updateType: TaskUpdateType;
  body: string;
  source: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface DailyPlan {
  id: string;
  planDate: string;
  mustDoTaskIds: string[];
  shouldDoTaskIds: string[];
  couldDoTaskIds: string[];
  notes?: string;
  generatedBy?: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPlan {
  id: string;
  weekStart: string;
  outcomes: string[];
  focusAreas: string[];
  openLoops: string[];
  generatedBy?: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface DailyPlanInput {
  planDate: string;
  mustDoTaskIds: string[];
  shouldDoTaskIds: string[];
  couldDoTaskIds: string[];
  notes?: string;
}

export interface WeeklyPlanInput {
  weekStart: string;
  outcomes: string[];
  focusAreas: string[];
  openLoops: string[];
}
```

Then extend the `AppData` interface — add three fields after `activityEvents: ActivityEvent[];`:

```ts
  activityEvents: ActivityEvent[];
  taskUpdates: TaskUpdate[];
  dailyPlans: DailyPlan[];
  weeklyPlans: WeeklyPlan[];
}
```

- [ ] **Step 4: Add empty arrays to seedData**

In `src/data/seed.ts`, find the `seedData` object literal and add the three new keys to it (alongside `activityEvents`). Add:

```ts
  taskUpdates: [],
  dailyPlans: [],
  weeklyPlans: [],
```

(If `seedData` is assembled from typed parts, place the three keys in the final object that is typed as / returned as `AppData`, so the literal satisfies the extended `AppData`.)

- [ ] **Step 5: Add normalizeAppData and use it in loadLocalData**

In `src/lib/storage.ts`, add the export near the top (after `makeId`, before `loadLocalData`):

```ts
export const normalizeAppData = (data: AppData): AppData => ({
  ...data,
  taskUpdates: data.taskUpdates ?? [],
  dailyPlans: data.dailyPlans ?? [],
  weeklyPlans: data.weeklyPlans ?? [],
});
```

Then update `loadLocalData` so both return paths normalize. Replace its body:

```ts
export const loadLocalData = (): AppData => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeAppData(seedData);
    return normalizeAppData(JSON.parse(raw) as AppData);
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Local demo mode should never break app startup.
    }
    return normalizeAppData(seedData);
  }
};
```

- [ ] **Step 6: Add temporary empty stubs to the Supabase loadData return**

In `src/lib/repository.ts`, the `loadData()` return object (currently ending at `activityEvents: activityEvents.map(mapActivityEvent),`) must satisfy the extended `AppData` or the build breaks. Add three temporary empty arrays (Task 3 replaces them with real fetches):

```ts
      activityEvents: activityEvents.map(mapActivityEvent),
      taskUpdates: [],
      dailyPlans: [],
      weeklyPlans: [],
    };
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — `normalizeAppData` fills the three arrays; sanity test still green.

- [ ] **Step 8: Confirm the build passes**

Run: `npm run build`
Expected: exits 0 (every `AppData` construction site now provides the three fields).

- [ ] **Step 9: Commit**

```bash
git add src/types.ts src/data/seed.ts src/lib/storage.ts src/lib/repository.ts src/lib/storage.test.ts
git commit -m "feat: add planning types and extend AppData with planning arrays"
```

---

### Task 3: Supabase read path — mappers and fetches

**Files:**
- Modify: `src/lib/repository.ts` (mappers + `loadData` fetches)
- Create: `src/lib/repository.test.ts`

**Interfaces:**
- Consumes: `TaskUpdate`, `DailyPlan`, `WeeklyPlan` from `../types`; `text`, `textArray`, `metadataValue`, `DbRow` (already in `repository.ts`).
- Produces: exported `mapTaskUpdate`, `mapDailyPlan`, `mapWeeklyPlan`; `loadData()` returns real rows for the three new arrays.

- [ ] **Step 1: Write the failing test for the mappers**

Create `src/lib/repository.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `mapTaskUpdate` / `mapDailyPlan` / `mapWeeklyPlan` are not exported from `./repository`.

- [ ] **Step 3: Add the three mappers**

In `src/lib/repository.ts`, first add the three new types to the existing import from `../types` (the block currently importing `ActivityEvent, AppData, Area, ...`). Add `TaskUpdate`, `DailyPlan`, `WeeklyPlan` to that import list.

Then add the three mapper consts next to `mapActivityEvent` (near the bottom of the file). They must be exported:

```ts
export const mapTaskUpdate = (row: DbRow): TaskUpdate => ({
  id: text(row.id),
  taskId: text(row.task_id),
  updateType: text(row.update_type) as TaskUpdate["updateType"],
  body: text(row.body),
  source: text(row.source),
  metadata: metadataValue(row.metadata),
  createdAt: text(row.created_at),
});

export const mapDailyPlan = (row: DbRow): DailyPlan => ({
  id: text(row.id),
  planDate: text(row.plan_date),
  mustDoTaskIds: textArray(row.must_do_task_ids),
  shouldDoTaskIds: textArray(row.should_do_task_ids),
  couldDoTaskIds: textArray(row.could_do_task_ids),
  notes: text(row.notes) || undefined,
  generatedBy: text(row.generated_by) || undefined,
  metadata: metadataValue(row.metadata),
  createdAt: text(row.created_at),
  updatedAt: text(row.updated_at),
});

export const mapWeeklyPlan = (row: DbRow): WeeklyPlan => ({
  id: text(row.id),
  weekStart: text(row.week_start),
  outcomes: textArray(row.outcomes),
  focusAreas: textArray(row.focus_areas),
  openLoops: textArray(row.open_loops),
  generatedBy: text(row.generated_by) || undefined,
  metadata: metadataValue(row.metadata),
  createdAt: text(row.created_at),
  updatedAt: text(row.updated_at),
});
```

- [ ] **Step 4: Fetch the three tables in loadData**

In `src/lib/repository.ts`, extend the `Promise.all` in `loadData()`. Add three names to the destructuring array (after `activityEvents`):

```ts
    const [
      areas,
      workspaces,
      projects,
      tasks,
      timeEntries,
      inboxItems,
      brainDumps,
      resources,
      weeklySnapshots,
      activityEvents,
      taskUpdates,
      dailyPlans,
      weeklyPlans,
    ] = await Promise.all([
      this.fetchTable("areas", "sort_order"),
      this.fetchTable("workspaces", "sort_order"),
      this.fetchTable("projects", "target_date"),
      this.fetchTable("tasks", "sort_order"),
      this.fetchTable("time_entries", "started_at", false),
      this.fetchTable("inbox_items", "received_at", false),
      this.fetchTable("brain_dumps", "created_at", false),
      this.fetchTable("resources", "category"),
      this.fetchTable("weekly_snapshots", "week_start", false),
      this.fetchTable("activity_events", "created_at", false),
      this.fetchTable("task_updates", "created_at", false),
      this.fetchTable("daily_plans", "plan_date", false),
      this.fetchTable("weekly_plans", "week_start", false),
    ]);
```

- [ ] **Step 5: Replace the empty stubs with mapped rows**

In the same `loadData()` return object, replace the three temporary stubs from Task 2:

```ts
      activityEvents: activityEvents.map(mapActivityEvent),
      taskUpdates: taskUpdates.map(mapTaskUpdate),
      dailyPlans: dailyPlans.map(mapDailyPlan),
      weeklyPlans: weeklyPlans.map(mapWeeklyPlan),
    };
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all three mapper suites green.

- [ ] **Step 7: Confirm the build passes**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 8: Commit**

```bash
git add src/lib/repository.ts src/lib/repository.test.ts
git commit -m "feat: load task_updates/daily_plans/weekly_plans in SupabaseRepository"
```

---

### Task 4: Demo write helpers (pure functions)

**Files:**
- Modify: `src/lib/storage.ts`
- Modify: `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `DailyPlanInput`, `WeeklyPlanInput`, `DailyPlan`, `WeeklyPlan`, `TaskUpdate` from `../types`; `makeId`, `saveLocalData` (already in `storage.ts`).
- Produces: `upsertDailyPlan(data, input): AppData`, `upsertWeeklyPlan(data, input): AppData`, `appendTaskUpdate(data, taskId, body): AppData` — each persists via `saveLocalData` and returns the next `AppData`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/storage.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `upsertDailyPlan` / `upsertWeeklyPlan` / `appendTaskUpdate` are not exported from `./storage`.

- [ ] **Step 3: Implement the three helpers**

In `src/lib/storage.ts`, add to the import from `../types` (currently `AppData, CaptureDraft, InboxItem, ResourceItem, Task`) the new names: `DailyPlan`, `DailyPlanInput`, `WeeklyPlan`, `WeeklyPlanInput`, `TaskUpdate`. Then add at the end of the file:

```ts
export const upsertDailyPlan = (data: AppData, input: DailyPlanInput): AppData => {
  const now = new Date().toISOString();
  const existing = data.dailyPlans.find((plan) => plan.planDate === input.planDate);
  const plan: DailyPlan = existing
    ? { ...existing, ...input, updatedAt: now }
    : {
        id: makeId("daily"),
        ...input,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      };
  const dailyPlans = existing
    ? data.dailyPlans.map((item) => (item.planDate === input.planDate ? plan : item))
    : [plan, ...data.dailyPlans];
  const next = { ...data, dailyPlans };
  saveLocalData(next);
  return next;
};

export const upsertWeeklyPlan = (data: AppData, input: WeeklyPlanInput): AppData => {
  const now = new Date().toISOString();
  const existing = data.weeklyPlans.find((plan) => plan.weekStart === input.weekStart);
  const plan: WeeklyPlan = existing
    ? { ...existing, ...input, updatedAt: now }
    : {
        id: makeId("weekly"),
        ...input,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      };
  const weeklyPlans = existing
    ? data.weeklyPlans.map((item) => (item.weekStart === input.weekStart ? plan : item))
    : [plan, ...data.weeklyPlans];
  const next = { ...data, weeklyPlans };
  saveLocalData(next);
  return next;
};

export const appendTaskUpdate = (data: AppData, taskId: string, body: string): AppData => {
  const update: TaskUpdate = {
    id: makeId("update"),
    taskId,
    updateType: "note",
    body,
    source: "manual",
    metadata: {},
    createdAt: new Date().toISOString(),
  };
  const next = { ...data, taskUpdates: [update, ...data.taskUpdates] };
  saveLocalData(next);
  return next;
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all storage suites green.

- [ ] **Step 5: Confirm the build passes**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: add demo-mode upsert/append helpers for planning tables"
```

---

### Task 5: Repository interface and mutation methods (both repositories)

**Files:**
- Modify: `src/lib/repository.ts` (interface + both classes)

**Interfaces:**
- Consumes: `DailyPlanInput`, `WeeklyPlanInput` from `../types`; the storage helpers `upsertDailyPlan`, `upsertWeeklyPlan`, `appendTaskUpdate`.
- Produces: `AppRepository.upsertDailyPlan`, `.upsertWeeklyPlan`, `.appendTaskUpdate` implemented by `LocalDemoRepository` and `SupabaseRepository`.

- [ ] **Step 1: Extend the AppRepository interface**

In `src/lib/repository.ts`, add `DailyPlanInput` and `WeeklyPlanInput` to the `../types` import list. Then add three methods to the `AppRepository` interface, after `convertInboxItem(...)` and before `resetDemoData?`:

```ts
  upsertDailyPlan(
    currentData: AppData,
    input: DailyPlanInput,
  ): Promise<AppData>;
  upsertWeeklyPlan(
    currentData: AppData,
    input: WeeklyPlanInput,
  ): Promise<AppData>;
  appendTaskUpdate(
    currentData: AppData,
    taskId: string,
    body: string,
  ): Promise<AppData>;
```

- [ ] **Step 2: Import the storage helpers into the demo repository**

In `src/lib/repository.ts`, extend the existing import from `./storage` (currently `convertInboxItem as convertLocalInboxItem, createCapture as createLocalCapture, ...`) with aliased names:

```ts
  appendTaskUpdate as appendLocalTaskUpdate,
  upsertDailyPlan as upsertLocalDailyPlan,
  upsertWeeklyPlan as upsertLocalWeeklyPlan,
```

- [ ] **Step 3: Implement the methods on LocalDemoRepository**

Add to the `LocalDemoRepository` class (after `convertInboxItem`, before `resetDemoData`). The storage helpers already persist via `saveLocalData`, so just delegate:

```ts
  async upsertDailyPlan(currentData: AppData, input: DailyPlanInput) {
    return upsertLocalDailyPlan(currentData, input);
  }

  async upsertWeeklyPlan(currentData: AppData, input: WeeklyPlanInput) {
    return upsertLocalWeeklyPlan(currentData, input);
  }

  async appendTaskUpdate(currentData: AppData, taskId: string, body: string) {
    return appendLocalTaskUpdate(currentData, taskId, body);
  }
```

- [ ] **Step 4: Implement the methods on SupabaseRepository**

Add to the `SupabaseRepository` class (after `convertInboxItem`, before the private `fetchTable`):

```ts
  async upsertDailyPlan(_currentData: AppData, input: DailyPlanInput) {
    const { data, error } = await this.client
      .from("daily_plans")
      .upsert(
        {
          user_id: this.user.id,
          plan_date: input.planDate,
          must_do_task_ids: input.mustDoTaskIds,
          should_do_task_ids: input.shouldDoTaskIds,
          could_do_task_ids: input.couldDoTaskIds,
          notes: input.notes ?? null,
          metadata: {},
        },
        { onConflict: "user_id,plan_date" },
      )
      .select("id")
      .single();
    if (error) throw error;
    await this.insertActivity(
      "daily_plan",
      data.id,
      "saved",
      `Saved daily plan for ${input.planDate}`,
      { plan_date: input.planDate },
    );
    return this.loadData();
  }

  async upsertWeeklyPlan(_currentData: AppData, input: WeeklyPlanInput) {
    const { data, error } = await this.client
      .from("weekly_plans")
      .upsert(
        {
          user_id: this.user.id,
          week_start: input.weekStart,
          outcomes: input.outcomes,
          focus_areas: input.focusAreas,
          open_loops: input.openLoops,
          metadata: {},
        },
        { onConflict: "user_id,week_start" },
      )
      .select("id")
      .single();
    if (error) throw error;
    await this.insertActivity(
      "weekly_plan",
      data.id,
      "saved",
      `Saved weekly plan for week of ${input.weekStart}`,
      { week_start: input.weekStart },
    );
    return this.loadData();
  }

  async appendTaskUpdate(currentData: AppData, taskId: string, body: string) {
    const task = currentData.tasks.find((item) => item.id === taskId);
    const { data, error } = await this.client
      .from("task_updates")
      .insert({
        user_id: this.user.id,
        task_id: taskId,
        update_type: "note",
        body,
        source: "manual",
        metadata: {},
      })
      .select("id")
      .single();
    if (error) throw error;
    await this.insertActivity(
      "task",
      taskId,
      "note_added",
      `Added note to task: ${task?.title || "Untitled task"}`,
      { task_update_id: data.id },
    );
    return this.loadData();
  }
```

- [ ] **Step 5: Confirm tests still pass**

Run: `npm test`
Expected: PASS — no new tests, existing suites green (demo delegation logic already covered in Task 4).

- [ ] **Step 6: Confirm the build passes**

Run: `npm run build`
Expected: exits 0 — both classes satisfy the extended `AppRepository`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/repository.ts
git commit -m "feat: add upsert/append planning mutations to both repositories"
```

---

### Task 6: Wire the Daily Planner (read stored plan + save)

**Files:**
- Modify: `src/App.tsx` (imports, `savePlan` handler, `DailyPlanner` component, render site)

**Interfaces:**
- Consumes: `repository.upsertDailyPlan`; `DailyPlanInput` from `./types`; `format` from `date-fns`.
- Produces: `DailyPlanner` reads today's stored plan when present, else derives; a save button persists the derived grouping.

- [ ] **Step 1: Add the date-fns and type imports**

In `src/App.tsx`, add after the lucide-react import block:

```ts
import { format, startOfWeek } from "date-fns";
```

And add `DailyPlanInput` and `WeeklyPlanInput` to the existing `./types` import list (currently `AppData, CaptureDraft, InboxItem, Project, Task, TaskStatus, ViewKey`).

- [ ] **Step 2: Add the savePlan handler**

In the `App` component, after the `changeTaskStatus` handler (around line 249), add:

```ts
  const savePlan = async (input: DailyPlanInput) => {
    setIsSaving(true);
    setAppError(null);
    try {
      const nextData = await repository.upsertDailyPlan(data, input);
      setData(nextData);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Unable to save daily plan.");
    } finally {
      setIsSaving(false);
    }
  };
```

- [ ] **Step 3: Replace the DailyPlanner component**

Replace the entire `function DailyPlanner({ data }: { data: AppData }) { ... }` (currently around lines 798-827) with:

```tsx
function DailyPlanner({
  data,
  onSavePlan,
  isSaving,
}: {
  data: AppData;
  onSavePlan: (input: DailyPlanInput) => void;
  isSaving: boolean;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const storedPlan = data.dailyPlans.find((plan) => plan.planDate === today);

  const derived = {
    mustDo: data.tasks
      .filter((task) => task.priority === "high" && task.status !== "done")
      .slice(0, 4),
    shouldDo: data.tasks
      .filter((task) => task.priority === "medium" && task.status !== "done")
      .slice(0, 4),
    couldDo: data.tasks
      .filter((task) => task.priority === "low" && task.status !== "done")
      .slice(0, 4),
  };

  const titleFor = (id: string) =>
    data.tasks.find((task) => task.id === id)?.title || "Unknown task";

  const groups: Record<string, string[]> = storedPlan
    ? {
        "Must Do": storedPlan.mustDoTaskIds.map(titleFor),
        "Should Do": storedPlan.shouldDoTaskIds.map(titleFor),
        "Could Do": storedPlan.couldDoTaskIds.map(titleFor),
      }
    : {
        "Must Do": derived.mustDo.map((task) => task.title),
        "Should Do": derived.shouldDo.map((task) => task.title),
        "Could Do": derived.couldDo.map((task) => task.title),
      };

  const handleSave = () => {
    onSavePlan({
      planDate: today,
      mustDoTaskIds: derived.mustDo.map((task) => task.id),
      shouldDoTaskIds: derived.shouldDo.map((task) => task.id),
      couldDoTaskIds: derived.couldDo.map((task) => task.id),
    });
  };

  return (
    <div className="content-grid">
      {Object.entries(groups).map(([title, items]) => (
        <section className="panel" key={title}>
          <PanelHeader title={title} icon={ListChecks} />
          <ListItems items={items} empty="No tasks here." />
        </section>
      ))}
      <section className="panel span-2">
        <PanelHeader title="Schedule and Deadlines" icon={CalendarDays} />
        <Timeline data={data} />
      </section>
      <section className="panel">
        <PanelHeader title="Unplanned Inbox Items" icon={Inbox} />
        <ListItems
          items={data.inboxItems
            .filter((item) => item.status === "new")
            .map((item) => item.title)}
        />
        <button
          className="secondary-action"
          type="button"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Sparkles size={16} />
          {storedPlan ? "Update today's plan" : "Save today's plan"}
        </button>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Update the DailyPlanner render site**

In `src/App.tsx`, replace the line `{activeView === "daily" && <DailyPlanner data={data} />}` (around line 400) with:

```tsx
        {activeView === "daily" && (
          <DailyPlanner data={data} onSavePlan={savePlan} isSaving={isSaving} />
        )}
```

- [ ] **Step 5: Confirm the build and tests pass**

Run: `npm run build`
Expected: exits 0.

Run: `npm test`
Expected: PASS (unchanged suites).

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 6: Manual smoke (demo mode)**

Run: `npm run dev`, open http://localhost:5173, go to the Daily view, click "Save today's plan". Expected: button relabels to "Update today's plan" and the Must/Should/Could tiers now render from the stored plan (titles resolved from task ids). Reload the page — the plan persists (localStorage in demo mode).

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: persist and read back daily plans in the Daily Planner"
```

---

### Task 7: Wire the Weekly Planner (read stored plan + save)

**Files:**
- Modify: `src/App.tsx` (`saveWeek` handler, `WeeklyPlanner` component, render site)

**Interfaces:**
- Consumes: `repository.upsertWeeklyPlan`; `WeeklyPlanInput` from `./types`; `format`, `startOfWeek` from `date-fns` (imported in Task 6).
- Produces: `WeeklyPlanner` reads this week's stored plan when present, else derives; a save button persists it.

- [ ] **Step 1: Add the saveWeek handler**

In the `App` component, immediately after the `savePlan` handler from Task 6, add:

```ts
  const saveWeek = async (input: WeeklyPlanInput) => {
    setIsSaving(true);
    setAppError(null);
    try {
      const nextData = await repository.upsertWeeklyPlan(data, input);
      setData(nextData);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Unable to save weekly plan.");
    } finally {
      setIsSaving(false);
    }
  };
```

- [ ] **Step 2: Replace the WeeklyPlanner component**

Replace the entire `function WeeklyPlanner({ data }: { data: AppData }) { ... }` (currently around lines 829-875) with:

```tsx
function WeeklyPlanner({
  data,
  onSaveWeek,
  isSaving,
}: {
  data: AppData;
  onSaveWeek: (input: WeeklyPlanInput) => void;
  isSaving: boolean;
}) {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const storedPlan = data.weeklyPlans.find((plan) => plan.weekStart === weekStart);

  const derivedOutcomes = [
    "Persistent LIVAL OS MVP is usable from desktop and mobile.",
    "Client delivery work remains visible against personal projects.",
    "Weekly evidence is generated from real stored activity.",
  ];
  const derivedFocusAreas = data.areas.slice(0, 4).map((area) => area.name as string);
  const derivedOpenLoops = data.tasks
    .filter((task) => task.status === "blocked")
    .map((task) => task.title);

  const outcomes = storedPlan ? storedPlan.outcomes : derivedOutcomes;
  const focusAreas = storedPlan ? storedPlan.focusAreas : derivedFocusAreas;
  const openLoops = storedPlan ? storedPlan.openLoops : derivedOpenLoops;

  const handleSave = () => {
    onSaveWeek({
      weekStart,
      outcomes: derivedOutcomes,
      focusAreas: derivedFocusAreas,
      openLoops: derivedOpenLoops,
    });
  };

  return (
    <div className="content-grid">
      <section className="panel span-2">
        <PanelHeader title="This Week's Outcomes" icon={Target} />
        <ListItems items={outcomes} empty="No outcomes set." />
        <button
          className="secondary-action"
          type="button"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Target size={16} />
          {storedPlan ? "Update this week" : "Save this week"}
        </button>
      </section>
      <section className="panel">
        <PanelHeader title="Focus Areas" icon={Sparkles} />
        <ListItems items={focusAreas} empty="No focus areas." />
      </section>
      <section className="panel span-2">
        <PanelHeader title="Project Priorities" icon={FolderKanban} />
        <div className="table-list">
          {data.projects.map((project) => (
            <div className="table-row" key={project.id}>
              <strong>{project.name}</strong>
              <span>{project.priority}</span>
              <Progress percent={project.progressPercent} />
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <PanelHeader title="Open Loops" icon={LifeBuoy} />
        <ListItems items={openLoops} empty="No blocked work." />
      </section>
      <section className="panel span-3">
        <PanelHeader title="Weekly Calendar Overview" icon={CalendarDays} />
        <div className="week-grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
            <div className="day-cell" key={day}>
              <strong>{day}</strong>
              <span>{index < 5 ? `${index + 1} focus block` : "Light"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Update the WeeklyPlanner render site**

In `src/App.tsx`, replace the line `{activeView === "weekly" && <WeeklyPlanner data={data} />}` (around line 401) with:

```tsx
        {activeView === "weekly" && (
          <WeeklyPlanner data={data} onSaveWeek={saveWeek} isSaving={isSaving} />
        )}
```

- [ ] **Step 4: Confirm the build, tests, and lint pass**

Run: `npm run build`
Expected: exits 0.

Run: `npm test`
Expected: PASS.

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 5: Manual smoke (demo mode)**

In the running dev app, open the Weekly view, click "Save this week". Expected: button relabels to "Update this week" and the Outcomes/Focus/Open-Loops render from the stored plan. Reload — persists.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: persist and read back weekly plans in the Weekly Planner"
```

---

### Task 8: Wire Task Detail notes (read task_updates + add note)

**Files:**
- Modify: `src/App.tsx` (`addTaskUpdate` handler, `TaskDetail` component, render site)
- Modify: `src/styles.css` (a `.note-input` rule)

**Interfaces:**
- Consumes: `repository.appendTaskUpdate`; `useState` (already imported).
- Produces: `TaskDetail` lists `task_updates` for the task and posts new notes.

- [ ] **Step 1: Add the addTaskUpdate handler**

In the `App` component, immediately after the `saveWeek` handler from Task 7, add:

```ts
  const addTaskUpdate = async (taskId: string, body: string) => {
    setIsSaving(true);
    setAppError(null);
    try {
      const nextData = await repository.appendTaskUpdate(data, taskId, body);
      setData(nextData);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Unable to add note.");
    } finally {
      setIsSaving(false);
    }
  };
```

- [ ] **Step 2: Replace the TaskDetail component**

Replace the entire `function TaskDetail({ data, task, onStatusChange }: {...}) { ... }` (currently around lines 1073-1119) with:

```tsx
function TaskDetail({
  data,
  task,
  onStatusChange,
  onAddNote,
  isSaving,
}: {
  data: AppData;
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onAddNote: (taskId: string, body: string) => void;
  isSaving: boolean;
}) {
  const [note, setNote] = useState("");
  const updates = data.taskUpdates.filter((update) => update.taskId === task.id);

  const handleAddNote = () => {
    const body = note.trim();
    if (!body) return;
    onAddNote(task.id, body);
    setNote("");
  };

  return (
    <div className="detail-layout">
      <section className="panel detail-hero">
        <Priority priority={task.priority} />
        <h2>{task.title}</h2>
        <p>{task.description}</p>
        <div className="detail-meta">
          <Metric label="Status" value={taskStatusLabels[task.status]} tone="purple" />
          <Metric label="Estimate" value={minutesToHours(task.estimatedMinutes)} tone="blue" />
          <Metric label="Due" value={task.dueDate || ("Unset" as string)} tone="green" />
        </div>
        <select
          value={task.status}
          onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}
        >
          {statusOrder.map((status) => (
            <option key={status} value={status}>
              {taskStatusLabels[status]}
            </option>
          ))}
        </select>
      </section>
      <section className="panel">
        <PanelHeader title="Subtasks" icon={ListChecks} />
        <ListItems items={["Define smallest next action", "Confirm required context", "Mark done when evidence exists"]} />
      </section>
      <section className="panel">
        <PanelHeader title="Files and Links" icon={Link2} />
        <ListItems
          items={data.resources
            .filter((resource) => resource.projectId === task.projectId)
            .map((resource) => resource.title)}
          empty="No linked resources."
        />
      </section>
      <section className="panel">
        <PanelHeader title="Notes" icon={Brain} />
        <ListItems
          items={updates.length ? updates.map((update) => update.body) : [task.description || "No notes yet."]}
          empty="No notes yet."
        />
        <textarea
          className="note-input"
          placeholder="Add a note..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <button
          className="secondary-action"
          type="button"
          onClick={handleAddNote}
          disabled={isSaving}
        >
          <Plus size={16} />
          Add note
        </button>
      </section>
      <section className="panel">
        <PanelHeader title="Activity" icon={Sparkles} />
        <ListItems
          items={data.activityEvents
            .filter((event) => event.entityId === task.id)
            .map((event) => event.message)}
          empty="No activity yet."
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Update the TaskDetail render site**

In `src/App.tsx` (around lines 436-441), update the `TaskDetail` usage to pass the new props. Replace the existing JSX:

```tsx
        {activeView === "task-detail" && selectedTask && (
          <TaskDetail
            data={data}
            task={selectedTask}
            onStatusChange={changeTaskStatus}
            onAddNote={addTaskUpdate}
            isSaving={isSaving}
          />
        )}
```

(Preserve any existing closing `)}` structure; only add the `onAddNote` and `isSaving` props.)

- [ ] **Step 4: Add a minimal CSS rule for the note input**

In `src/styles.css`, append:

```css
.note-input {
  width: 100%;
  min-height: 64px;
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  resize: vertical;
}
```

(If `--border`, `--surface`, or `--text` are not the variable names used in `styles.css`, substitute the equivalent existing variables — check the `:root` block at the top of the file.)

- [ ] **Step 5: Confirm the build, tests, and lint pass**

Run: `npm run build`
Expected: exits 0.

Run: `npm test`
Expected: PASS.

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 6: Manual smoke (demo mode)**

In the running dev app, open a task (Command Center or Board → a task card), type a note in the Notes box, click "Add note". Expected: the note appears in the Notes list (replacing the description fallback), the textarea clears. Reload — the note persists.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/styles.css
git commit -m "feat: list and append task_updates in Task Detail notes"
```

---

### Task 9: Update project docs

**Files:**
- Modify: `CLAUDE.md` (State + PRD Alignment sections)

**Interfaces:** None — documentation only.

- [ ] **Step 1: Record the wired tables in CLAUDE.md State**

In `CLAUDE.md`, under `## State`, add a bullet after the Supabase migrations bullet:

```markdown
- Planning tables wired (Phase 2 data layer): `task_updates`, `daily_plans`, `weekly_plans` load into `AppData` and are read+written by the Daily Planner, Weekly Planner, and Task Detail views (Approach A — snapshot-then-persist). `automation_runs` / `integrations` / `file_changes` remain unwired.
```

- [ ] **Step 2: Point the PRD Alignment section at the new spec**

In `CLAUDE.md`, under `## PRD Alignment`, append to the third bullet (or add a new bullet):

```markdown
- Phase 2 data-layer wiring: see `docs/superpowers/specs/2026-06-16-phase2-planning-tables-wiring-design.md` and `docs/superpowers/plans/2026-06-16-phase2-planning-tables-wiring.md`. UI extraction of `src/App.tsx` into `src/components/*` remains the next deferred effort.
```

- [ ] **Step 3: Confirm the build still passes**

Run: `npm run build`
Expected: exits 0 (no code change).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record Phase 2 planning-tables wiring in CLAUDE.md"
```

---

## Completion Summary Template

```text
Files changed:
- package.json, vitest.config.ts, tsconfig.app.json — vitest harness
- src/types.ts — TaskUpdate/DailyPlan/WeeklyPlan + inputs, AppData extended
- src/data/seed.ts — empty planning arrays
- src/lib/storage.ts — normalizeAppData + 3 demo helpers
- src/lib/repository.ts — 3 mappers, 3 loadData fetches, interface + 3 methods on both repos
- src/App.tsx — savePlan/saveWeek/addTaskUpdate handlers + DailyPlanner/WeeklyPlanner/TaskDetail wiring
- src/styles.css — .note-input
- src/lib/storage.test.ts, src/lib/repository.test.ts — pure-function tests
- CLAUDE.md — state + PRD alignment notes

Commands run:
- npm test (vitest run)
- npm run build (tsc -b && vite build)
- npm run lint

Errors found: [list any, or "none"]

Next recommended phase:
Phase 2 UI extraction — split src/App.tsx (now larger after wiring) into
src/components/* with focused files per view. Optionally wire the remaining
migration-002 tables (automation_runs, integrations, file_changes) once an
ingestion path / settings UI exists to populate them.
```
