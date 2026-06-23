# LIVAL OS — Superpowers Kanban

Track Phase 0–4 alignment and implementation progress.

---

## Phase 0: Docs & Framework Decision

**Status: ✅ DONE**

| Task | Status | Notes |
|------|--------|-------|
| Confirm Vite SPA vs. Next.js | ✅ Done | Decision: stay Vite. Preserve working code. |
| Fix CLAUDE.md Tailwind claim | ✅ Done | Removed false "Tailwind CSS" claim (179e658). |
| Add PRD Alignment section | ✅ Done | Records Vite decision + references live docs (179e658). |
| Document framework decision | ✅ Done | Spec: 2026-06-16-prd-phase0-1-alignment-design.md |

**Deliverables:**
- Root CLAUDE.md updated
- Framework decision documented
- PRD Gap Audit identified as live roadmap

**Commits:** `03f1ce0..179e658`

---

## Phase 1: Supabase Migration — Planning & Integration Tables

**Status: ✅ DONE**

| Task | Status | Notes |
|------|--------|-------|
| Create migration 002 SQL | ✅ Done | 6 new tables: task_updates, daily_plans, weekly_plans, automation_runs, integrations, file_changes (0ed3bac). |
| Add indexes & RLS | ✅ Done | 6 indexes, 6 owner policies (single combined `for all` per table), 3 triggers (daily/weekly_plans, integrations). |
| Verify no collisions | ✅ Done | Zero table/policy name dupes vs. migration 001. |
| Test build/lint | ✅ Done | npm run build, npm run lint pass. |
| Commit migration file | ✅ Done | Commit 0ed3bac. Not applied to live Supabase yet (draft only). |

**Deliverables:**
- `supabase/migrations/002_add_planning_and_integration_tables.sql` (237 lines, 6 tables)
- All tables follow migration 001 conventions: `gen_random_uuid()`, `CHECK` constraints, single RLS policy per table
- Ready for manual application via Supabase dashboard

**Commits:** `179e658..0ed3bac`

---

## Phase 2: UI Extraction & Repository Wiring

**Status: ⏳ TODO**

Extract `src/App.tsx` (1574 lines) into components. Wire new Phase 1 tables into persistence layer.

| Task | Status | Notes |
|------|--------|-------|
| Extract sidebar | 🔲 Todo | `src/components/sidebar.tsx`. Navigator for all views. |
| Extract command center | 🔲 Todo | `src/components/views/CommandCenter.tsx`. Main dashboard. |
| Extract daily planner | 🔲 Todo | `src/components/views/DailyPlanner.tsx`. Wired to `daily_plans` table. |
| Extract weekly planner | 🔲 Todo | `src/components/views/WeeklyPlanner.tsx`. Wired to `weekly_plans` table. |
| Extract board view | 🔲 Todo | `src/components/views/BoardView.tsx`. Jira-like task columns. |
| Extract projects view | 🔲 Todo | `src/components/views/ProjectsView.tsx`. Project list/grid. |
| Extract task detail | 🔲 Todo | `src/components/views/TaskDetail.tsx`. Includes `task_updates` history. |
| Add repository methods | 🔲 Todo | `src/lib/repository.ts`: fetch/insert daily_plans, weekly_plans, task_updates. |
| Add types | 🔲 Todo | `src/types.ts`: types for new tables. |
| Refactor App.tsx | 🔲 Todo | Remove view logic, import extracted components. |
| Test all views render | 🔲 Todo | Verify each component loads with real data. |

**Goal:** Single-responsibility components, repository layer owns Supabase access, App.tsx navigation only.

**Validation:**
- `npm run lint` passes
- `npm run build` passes
- All views render without errors
- Daily/weekly planners persist to database
- Task updates log appears in task detail

---

## Phase 3: Ingestion Endpoints (Edge Functions)

**Status: 🔄 IN PROGRESS**

Enable external capture: Claude Code hooks, Codex, Apple Shortcuts, GitHub, manual API calls.

| Task | Status | Notes |
|------|--------|-------|
| Edge function: quick-capture | 🔄 In Progress | Create inbox_items from brief captures. |
| Edge function: time-entry | 🔄 In Progress | Log time to time_entries. External ref idempotency. |
| Edge function: file-change | 🔄 In Progress | Track file edits to file_changes table. |
| Edge function: activity-event | 🔄 In Progress | Log activity_events (system-level actions). |
| Bearer secret verification | 🔄 In Progress | All endpoints require LIVAL_INGEST_SECRET. |
| JSON response helpers | 🔄 In Progress | Consistent success/error response format. |
| Deno test harness | 🔄 In Progress | Unit tests for edge functions. |
| Supabase CLI project init | 🔄 In Progress | Local dev + CI/CD setup. |
| Claude Code hook integration | 🔄 In Progress | Hook calls edge function on task completion. |
| Apple Shortcut example | 🔄 In Progress | Shortcut that POSTs time entries to endpoint. |

**Goal:** Hands-free capture from dev tools + personal automation. No manual entry required unless useful.

**Recent commits:**
- `f119716`: init supabase CLI project + deno test harness
- `082ea77`: bearer-secret verification
- `f84d231`: CORS + JSON response helpers
- `df68ef0`: env reader + service-role client factory
- `99c1eab`: ingest-quick-capture edge function
- `e7b89ed`: ingest-quick-capture edge function
- `570753a`: docs ingestion producer setup (curl, Claude Code hook, Apple Shortcut)
- `9c95177`: unique index on time_entries (user_id, external_ref) for ingest idempotency
- `4820a61`: docs Phase 3 ingestion edge functions in CLAUDE.md
- `b070048`: docs settings.json env path for hook secret inheritance

---

## Phase 4: Deployment & Polish

**Status: 🔲 TODO**

Deploy to Vercel. Verify RLS, auth, env vars.

| Task | Status | Notes |
|------|--------|-------|
| Update .env.example | 🔲 Todo | Document all required env vars (no real values). |
| Supabase auth config | 🔲 Todo | Verify email/password provider is enabled. |
| Vercel project setup | 🔲 Todo | Connect GitHub repo, configure deployment. |
| Environment variables | 🔲 Todo | Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, etc. on Vercel. |
| Build verification | 🔲 Todo | `npm run build` produces dist/. |
| RLS smoke test | 🔲 Todo | Verify single user cannot see other user data. |
| Auth smoke test | 🔲 Todo | Create account, log in, log out. |
| Ingestion smoke test | 🔲 Todo | Call edge functions from curl. Verify rows appear. |
| Deploy | 🔲 Todo | Push to Vercel. Visit app. |
| Production docs | 🔲 Todo | Update README.md with deployment instructions. |

**Goal:** Live, working, user-ready app.

---

## Summary

| Phase | Status | Files Changed | Commits | Key Deliverable |
|-------|--------|---------------|---------|-----------------|
| 0 | ✅ Done | CLAUDE.md | 1 | Framework decision locked in docs. |
| 1 | ✅ Done | migration 002 SQL | 1 | 6 new tables, RLS, ready for manual apply. |
| 2 | ⏳ Todo | src/components/*, src/lib/repository.ts, src/types.ts | TBD | Single-responsibility UI, persistence layer. |
| 3 | 🔄 In Progress | supabase/functions/*, hooks, docs | 10+ | Hands-free capture from dev tools. |
| 4 | 🔲 Todo | .env.example, vercel.json, README.md | TBD | Live on Vercel, production-ready. |

**Current:** Phase 2 next (UI extraction). Phase 3 actively being built in parallel.

---

## How to Update This Board

Use the skill `superpowers:kanban-manager` to:
- Move tasks between statuses: `move-task <task> <status>`
- Add a task: `add-task <phase> <task>`
- Mark complete: `mark-done <task>`
- Get status: `show-phase <phase-number>`

Or edit this file directly and commit the change with message:
```
docs: kanban update — Phase N task moved to [status]
```
