# LIVAL OS — PRD Phase 0 + Phase 1 Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix stale project docs and add the missing PRD-required Supabase tables, without touching any existing table, column, or `src/**` application code.

**Architecture:** Two independent, additive changes: (1) edit root `CLAUDE.md` to correct a false claim and record the Vite-vs-Next.js decision, (2) draft a new Supabase migration file containing six new tables. Neither change modifies existing behavior — the app's build, lint, and runtime are unaffected.

**Tech Stack:** Markdown (CLAUDE.md), PostgreSQL/Supabase SQL (migration file). No TypeScript/React files are touched in this plan.

## Global Constraints

- Stay on Vite + React 19 + TypeScript SPA. Do not port to Next.js, Tailwind, or shadcn/ui.
- Env vars stay `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — do not introduce `NEXT_PUBLIC_*` naming.
- Do not rename or modify any table/column in `supabase/migrations/001_lival_os_initial_schema.sql`. `brain_dumps` and `weekly_snapshots` already satisfy the PRD's `brain_dump_items`/`weekly_summaries` — no new tables for those.
- New tables use `gen_random_uuid()` (pgcrypto, already enabled by migration 001) — not `uuid_generate_v4()`/`uuid-ossp`.
- New tables use `CHECK (...)` constraints for status/type fields — not Postgres `ENUM` types.
- Each new table gets exactly one combined RLS policy (`for all to authenticated using (...) with check (...)`) — not 4 split policies.
- `automation_runs.user_id` is `not null` (deviates from the PRD's nullable spec — this is a single-user app, every other table requires `user_id`).
- `file_changes.project_id` / `file_changes.task_id` use `on delete set null` — not `on delete cascade`.
- The new migration file is drafted and committed but **not applied** to the live Supabase project — no Supabase CLI link exists in this repo (`supabase/config.toml` absent, `supabase` binary not installed).
- No `src/**` file changes in this plan. No UI wiring of the new tables.
- Source design doc: `docs/superpowers/specs/2026-06-16-prd-phase0-1-alignment-design.md`.

---

### Task 1: Fix and extend root CLAUDE.md (Phase 0)

**Files:**
- Modify: `/Users/liana/Documents/LianaOS/CLAUDE.md`

**Interfaces:** None — this is a documentation-only task with no code interfaces.

- [ ] **Step 1: Fix the false Tailwind claim in the Stack section**

Current text in `CLAUDE.md` (under `## Stack`):

```markdown
## Stack
- Vite + React 19 + TypeScript
- Tailwind CSS (inline via styles.css)
- Supabase (auth + Postgres) — project `LIVAL_OS`, ref `mfcdzgkhmzppfctdzhwy`
- `@supabase/supabase-js` v2.50+
- lucide-react icons, date-fns
```

Replace the second bullet. Use the Edit tool with:

old_string:
```
## Stack
- Vite + React 19 + TypeScript
- Tailwind CSS (inline via styles.css)
- Supabase (auth + Postgres) — project `LIVAL_OS`, ref `mfcdzgkhmzppfctdzhwy`
```

new_string:
```
## Stack
- Vite + React 19 + TypeScript
- Custom CSS (hand-written CSS variables in `src/styles.css` — no Tailwind, no PostCSS, no build-time CSS framework)
- Supabase (auth + Postgres) — project `LIVAL_OS`, ref `mfcdzgkhmzppfctdzhwy`
```

- [ ] **Step 2: Verify the false claim is gone**

Run: `grep -n "Tailwind" CLAUDE.md`
Expected: no output (no matches).

- [ ] **Step 3: Add a "PRD Alignment" section recording the framework decision**

Insert a new section immediately after the `## State` section and before `## Env`. Current boundary text in `CLAUDE.md`:

```markdown
## State
- Branch: `supabase-setup` (working branch as of 2026-06-16)
- Supabase: connected. Migration `001_lival_os_initial_schema.sql` applied.
- Auth: email/password via Supabase Auth (enable in dashboard → Authentication → Providers → Email). User needs to create account on first run ("First setup? Create account").
- App runs on `npm run dev` → http://localhost:5173

## Env
```

Use the Edit tool with:

old_string:
```
- App runs on `npm run dev` → http://localhost:5173

## Env
```

new_string:
```
- App runs on `npm run dev` → http://localhost:5173

## PRD Alignment
- Framework decision (2026-06-16): staying on Vite + React SPA — **not** porting to Next.js. Resolved per explicit instruction to preserve working code and make the smallest safe changes.
- `docs/CLAUDE.md` and `docs/LIVAL_OS_Supabase_Vercel_App_Spec.md` describe a Next.js + Tailwind + shadcn/ui target architecture. Treat both as a superseded reference, not the active build plan.
- `docs/PRD_Gap_Audit.md` is the live remediation roadmap. See `docs/superpowers/specs/2026-06-16-prd-phase0-1-alignment-design.md` for the Phase 0/1 design and `supabase/migrations/002_add_planning_and_integration_tables.sql` for the Phase 1 schema additions.

## Env
```

- [ ] **Step 4: Verify the new section is present and correctly placed**

Run: `grep -n "^## " CLAUDE.md`
Expected output includes, in order, a line for `## State`, then `## PRD Alignment`, then `## Env` (exact line numbers will vary, just confirm that ordering and that all three headings appear).

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: fix stale Tailwind claim, record Vite-vs-Next.js decision

CLAUDE.md claimed Tailwind CSS but the app has no Tailwind/PostCSS
dependency — it's hand-written CSS variables. Also records the
Phase 0 decision to stay on Vite rather than port to Next.js, and
points at docs/PRD_Gap_Audit.md as the live roadmap.
EOF
)"
```

---

### Task 2: Draft Supabase migration 002 — planning and integration tables (Phase 1)

**Files:**
- Create: `supabase/migrations/002_add_planning_and_integration_tables.sql`

**Interfaces:**
- Consumes: `public.set_updated_at()` trigger function (already defined in `supabase/migrations/001_lival_os_initial_schema.sql`, not redefined here). References `auth.users(id)`, `public.tasks(id)`, `public.projects(id)` (all defined in migration 001).
- Produces: six new tables — `public.task_updates`, `public.daily_plans`, `public.weekly_plans`, `public.automation_runs`, `public.integrations`, `public.file_changes` — for a future Phase 2 to wire into `src/lib/repository.ts` and `src/types.ts`. No code in this plan consumes them yet.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/002_add_planning_and_integration_tables.sql` with this exact content:

```sql
-- LIVAL OS — Phase 1 PRD alignment: planning + integration tables.
-- Additive only. Does not modify any table defined in
-- 001_lival_os_initial_schema.sql. Reuses the existing
-- public.set_updated_at() trigger function from that migration.

create table public.task_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  update_type text not null default 'note' check (update_type in ('note', 'status_change', 'time_logged', 'file_change', 'system')),
  body text not null,
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  must_do_task_ids uuid[] not null default '{}',
  should_do_task_ids uuid[] not null default '{}',
  could_do_task_ids uuid[] not null default '{}',
  notes text,
  generated_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  outcomes text[] not null default '{}',
  focus_areas text[] not null default '{}',
  open_loops text[] not null default '{}',
  generated_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  automation_name text not null,
  source text,
  status text not null default 'success' check (status in ('success', 'error', 'partial')),
  input_summary text,
  output_summary text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  display_name text,
  status text not null default 'active' check (status in ('active', 'disabled', 'error')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, display_name)
);

create table public.file_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  file_path text not null,
  change_type text check (change_type in ('created', 'modified', 'deleted', 'renamed')),
  repo_path text,
  github_url text,
  summary text,
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index task_updates_task_id_created_idx on public.task_updates (task_id, created_at desc);
create index daily_plans_user_id_plan_date_idx on public.daily_plans (user_id, plan_date);
create index weekly_plans_user_id_week_start_idx on public.weekly_plans (user_id, week_start);
create index automation_runs_user_id_started_idx on public.automation_runs (user_id, started_at desc);
create index file_changes_project_id_idx on public.file_changes (project_id);
create index file_changes_task_id_idx on public.file_changes (task_id);

create trigger daily_plans_set_updated_at before update on public.daily_plans
  for each row execute function public.set_updated_at();
create trigger weekly_plans_set_updated_at before update on public.weekly_plans
  for each row execute function public.set_updated_at();
create trigger integrations_set_updated_at before update on public.integrations
  for each row execute function public.set_updated_at();

alter table public.task_updates enable row level security;
alter table public.daily_plans enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.automation_runs enable row level security;
alter table public.integrations enable row level security;
alter table public.file_changes enable row level security;

create policy task_updates_owner_policy on public.task_updates
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy daily_plans_owner_policy on public.daily_plans
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy weekly_plans_owner_policy on public.weekly_plans
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy automation_runs_owner_policy on public.automation_runs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy integrations_owner_policy on public.integrations
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy file_changes_owner_policy on public.file_changes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
```

- [ ] **Step 2: Check for naming collisions against migration 001**

Run each of these three commands from the repo root:

```bash
grep -ohE 'create table public\.[a-zA-Z_]+' supabase/migrations/001_lival_os_initial_schema.sql supabase/migrations/002_add_planning_and_integration_tables.sql | sort | uniq -d
```
Expected: no output (zero duplicate table names across both files).

```bash
grep -ohE 'create policy [a-zA-Z_]+' supabase/migrations/001_lival_os_initial_schema.sql supabase/migrations/002_add_planning_and_integration_tables.sql | sort | uniq -d
```
Expected: no output (zero duplicate policy names).

```bash
grep -c "create or replace function public.set_updated_at" supabase/migrations/001_lival_os_initial_schema.sql supabase/migrations/002_add_planning_and_integration_tables.sql
```
Expected:
```
supabase/migrations/001_lival_os_initial_schema.sql:1
supabase/migrations/002_add_planning_and_integration_tables.sql:0
```
(The function is defined once in 001 and reused, not redefined, in 002.)

If any command produces unexpected output, stop and resolve the collision before continuing — do not rename around it silently.

- [ ] **Step 3: Run regression validation**

No `src/**` file changes in this plan, so these commands should pass exactly as they did before this task — they confirm the new SQL file didn't accidentally break anything picked up by the build (e.g. if a `.sql` file were mistakenly placed under `src/`).

Run: `npm run lint`
Expected: exits 0, no new errors.

Run: `npm run build`
Expected: exits 0 (`tsc -b && vite build` succeeds).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_add_planning_and_integration_tables.sql
git commit -m "$(cat <<'EOF'
feat(supabase): draft migration for task_updates/daily_plans/weekly_plans/automation_runs/integrations/file_changes

Additive-only schema per docs/superpowers/specs/2026-06-16-prd-phase0-1-alignment-design.md.
No existing table/column changes. Not applied to the live Supabase
project — apply manually via the dashboard SQL editor when ready,
same as migration 001.
EOF
)"
```

---

## Completion Summary Template

After both tasks are done, report using this format (per the user's originally requested deliverable shape):

```text
Files changed:
- CLAUDE.md — [confirm: fixed Tailwind claim, added PRD Alignment section]
- supabase/migrations/002_add_planning_and_integration_tables.sql — [confirm: created, 6 tables]

Why:
- CLAUDE.md was inaccurate (claimed Tailwind, app has none) and didn't record the Vite-vs-Next.js decision needed to resolve the PRD gap audit's blocking question.
- Migration 002 adds the PRD's missing tables (task_updates, daily_plans, weekly_plans, automation_runs, integrations, file_changes) without touching anything that already works.

Commands run:
- grep -n "Tailwind" CLAUDE.md
- grep -n "^## " CLAUDE.md
- grep -ohE 'create table public\.[a-zA-Z_]+' ... | sort | uniq -d
- grep -ohE 'create policy [a-zA-Z_]+' ... | sort | uniq -d
- grep -c "create or replace function public.set_updated_at" ...
- npm run lint
- npm run build

Errors found: [list any, or "none"]

Next recommended phase:
Phase 2 — extract UI from the monolithic src/App.tsx (1574 lines) into
src/components/*, and wire daily_plans/weekly_plans/task_updates into
src/lib/repository.ts + src/types.ts so the Daily Planner and Weekly
Planner views (currently UI skeletons per docs/PRD_Gap_Audit.md) persist
real data. Migration 002 must be applied to the live Supabase project
(via dashboard SQL editor) before Phase 2 UI work depends on it.
```
