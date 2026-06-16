# Phase 2 — Planning Tables Wiring Design

**Date:** 2026-06-16
**Status:** Approved (pending user review of this spec)
**Depends on:** Migration `002_add_planning_and_integration_tables.sql` (applied to live Supabase 2026-06-16, verified).
**Supersedes for this slice:** the "Phase 2" line in `docs/PRD_Gap_Audit.md` / prior plan — this covers **only** the data-layer + minimal write wiring half. UI extraction of `App.tsx` is a separate later effort.

## Goal

Make `task_updates`, `daily_plans`, and `weekly_plans` real persisted entities: load them into `AppData`, and add minimal write paths so the existing Daily Planner, Weekly Planner, and Task Detail views can persist and read back real rows — without building any new view.

## Scope

In scope:
- New TypeScript types + `AppData` extension.
- Read path: both repositories load the 3 tables; demo mode mirrors them.
- Write path: 3 repository methods (`upsertDailyPlan`, `upsertWeeklyPlan`, `appendTaskUpdate`) on both repositories.
- Minimal UI wiring into existing `DailyPlanner`, `WeeklyPlanner`, `TaskDetail` (Approach A — snapshot-then-persist).
- A vitest harness covering the pure functions (3 mappers + 3 demo helpers).

Out of scope (explicitly deferred):
- Extracting `App.tsx` into `src/components/*` (job #2).
- Full per-tier plan editors (add/remove individual tasks per tier).
- `automation_runs` / `integrations` / `file_changes` wiring.
- Ingestion endpoints / external POST paths.
- Any change to existing tables, columns, or the Next.js/Tailwind target architecture.

## Approach Decision

**Approach A — snapshot-then-persist** (chosen over B full-editor and C notes-only):

- The planner renders its current derived suggestions.
- A single "Save" button snapshots that grouping into a `DailyPlanInput` / `WeeklyPlanInput` and persists it (upsert keyed on date/week).
- Once a row exists for today / this week, the view reads from the stored row instead of deriving.
- Editing = adjust nothing in new UI; re-deriving + re-saving overwrites the row (upsert on the unique constraint).

This gives genuine persistence with zero new views. Rationale: B requires new editor UI, which collides with the deferred `App.tsx` extraction; C leaves the tables nearly empty and adds little value.

## Data Model

### types.ts additions

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
  planDate: string; // YYYY-MM-DD
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
  weekStart: string; // YYYY-MM-DD (Monday)
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

`AppData` gains:

```ts
taskUpdates: TaskUpdate[];
dailyPlans: DailyPlan[];
weeklyPlans: WeeklyPlan[];
```

### Column mapping (snake_case DB → camelCase type)

| Table | DB columns | Type |
|-------|-----------|------|
| `task_updates` | `task_id, update_type, body, source, metadata, created_at` | `TaskUpdate` |
| `daily_plans` | `plan_date, must_do_task_ids, should_do_task_ids, could_do_task_ids, notes, generated_by, metadata, created_at, updated_at` | `DailyPlan` |
| `weekly_plans` | `week_start, outcomes, focus_areas, open_loops, generated_by, metadata, created_at, updated_at` | `WeeklyPlan` |

uuid[]/text[] columns map via the existing `textArray()` helper; `metadata` via `metadataValue()`; timestamps/strings via `text()`.

## Repository Interface

```ts
export interface AppRepository {
  // ...existing...
  upsertDailyPlan(currentData: AppData, input: DailyPlanInput): Promise<AppData>;
  upsertWeeklyPlan(currentData: AppData, input: WeeklyPlanInput): Promise<AppData>;
  appendTaskUpdate(currentData: AppData, taskId: string, body: string): Promise<AppData>;
}
```

All three return fresh `AppData` (reload in Supabase, in-place next state in demo) — same contract as existing mutations.

### SupabaseRepository

- `loadData()`: add 3 entries to the `Promise.all` fan-out:
  - `fetchTable("task_updates", "created_at", false)`
  - `fetchTable("daily_plans", "plan_date", false)`
  - `fetchTable("weekly_plans", "week_start", false)`
  - map with `mapTaskUpdate` / `mapDailyPlan` / `mapWeeklyPlan`, add to returned object.
- `upsertDailyPlan`: `.from("daily_plans").upsert({ user_id, plan_date, must_do_task_ids, should_do_task_ids, could_do_task_ids, notes, metadata: {} }, { onConflict: "user_id,plan_date" }).select("id").single()`, then `insertActivity("daily_plan", id, "saved", ...)`, then `loadData()`.
- `upsertWeeklyPlan`: same shape, `onConflict: "user_id,week_start"`, columns `outcomes / focus_areas / open_loops`.
- `appendTaskUpdate`: `.from("task_updates").insert({ user_id, task_id, update_type: "note", body, source: "manual", metadata: {} })`, then `insertActivity("task", taskId, "note_added", ...)`, then `loadData()`.
- 3 new mapper consts (`mapTaskUpdate`, `mapDailyPlan`, `mapWeeklyPlan`) following the existing `mapX` style.

### LocalDemoRepository + storage.ts

- `storage.ts` gains 3 pure helpers operating on `AppData` and persisting via `saveLocalData`:
  - `upsertDailyPlan(data, input): AppData` — replace existing `dailyPlans` entry where `planDate === input.planDate`, else append; new id via the existing `makeId("daily")` generator; stamp `createdAt`/`updatedAt`.
  - `upsertWeeklyPlan(data, input): AppData` — same, keyed on `weekStart`.
  - `appendTaskUpdate(data, taskId, body): AppData` — push a `TaskUpdate` (`updateType: "note"`, `source: "manual"`, `metadata: {}`, fresh id, `createdAt`).
- `LocalDemoRepository` delegates to these (same pattern as `updateTaskStatus`).
- `loadLocalData()` currently returns `JSON.parse(raw) as AppData` directly, so pre-existing demo blobs (key `lival-os-demo-data:v2`) lack the 3 new arrays. Add a normalize step filling `taskUpdates`/`dailyPlans`/`weeklyPlans` with `[]` when absent, so the new views never `.filter` on `undefined`.

### seed.ts

Add `taskUpdates: []`, `dailyPlans: []`, `weeklyPlans: []` to `seedData`. Empty arrays: Supabase `bootstrapSeedData` skips zero-length inserts, `seedClientIds` spread contributes nothing, and the write path populates them at runtime.

## UI Wiring (no new views)

Date helpers via date-fns (already a dependency): `format(new Date(), "yyyy-MM-dd")` for today; `format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")` for week start.

- **DailyPlanner** (`App.tsx`): new props `onSavePlan: (input: DailyPlanInput) => void`, plus reads `data.dailyPlans`. If a plan exists for today, render Must/Should/Could tiers from its stored task-id arrays (resolve ids → titles via `data.tasks`); else keep the current priority-derived grouping. Replace the "Auto-plan placeholder" button with "Save today's plan", which snapshots the currently-shown grouping into a `DailyPlanInput` and calls `onSavePlan`.
- **WeeklyPlanner** (`App.tsx`): new prop `onSaveWeek: (input: WeeklyPlanInput) => void`. If a plan exists for this week, render its `outcomes` / `focusAreas` / `openLoops`; else current behavior (hardcoded outcomes, areas as focus, blocked tasks as open loops). Add a "Save this week" button persisting the currently-shown values.
- **TaskDetail** (`App.tsx`): new prop `onAddNote: (taskId: string, body: string) => void`. Notes panel renders `data.taskUpdates.filter(u => u.taskId === task.id)` (newest first) instead of `[task.description]`; add a small textarea + "Add note" button calling `onAddNote`, clearing on submit.
- **App.tsx handlers**: `savePlan`, `saveWeek`, `addTaskUpdate` — each mirrors `changeTaskStatus` (guard with the existing saving flag, `setData(await repository.x(...))`, error handling), passed into the three views.

## Testing

Add **vitest** as a dev dependency with a minimal config (`vitest` + `"test": "vitest run"` script). Cover only the regression-prone pure functions — no React/DOM rendering tests:

- `mapTaskUpdate` / `mapDailyPlan` / `mapWeeklyPlan`: given a representative DB row (snake_case, array + metadata + null fields), assert the camelCase shape, array coercion, and undefined handling for nullable fields.
- `storage.upsertDailyPlan` / `upsertWeeklyPlan`: assert insert-when-absent and replace-when-present (same date/week does not duplicate), and that other arrays are untouched.
- `storage.appendTaskUpdate`: assert a new update is appended with `updateType: "note"` and the target `taskId`.

To make the Supabase mappers importable by tests, export the three `mapX` consts from `repository.ts`.

Wiring + UI verified separately via `npm run build` (`tsc -b && vite build`) and a manual smoke pass in demo mode (save a daily plan, reload, confirm it reads back; add a task note, confirm it lists).

## Verification Commands

```bash
npm run lint        # eslint . — exits 0
npm run build       # tsc -b && vite build — exits 0
npm test            # vitest run — pure-function tests pass
```

## Risks / Notes

- Existing demo localStorage blobs predate the 3 new arrays; `loadLocalData()` must default them to `[]` or `.map`/`.filter` calls on the new views will throw.
- `daily_plans` / `weekly_plans` upserts rely on the DB unique constraints `(user_id, plan_date)` / `(user_id, week_start)` from migration 002 — already applied and verified.
- Approach A overwrites a day's/week's plan on each save (no history). Acceptable for single-user MVP; `task_updates` is the append-only log if history is wanted later.
