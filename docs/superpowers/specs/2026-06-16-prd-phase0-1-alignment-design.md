# LIVAL OS — PRD Phase 0 + Phase 1 Alignment Design

Date: 2026-06-16
Status: Approved by user, ready for implementation plan

## Context

LIVAL OS was originally documented with conflicting plans:

- Root `/CLAUDE.md` (checked into the repo, loaded automatically by Claude Code) describes the **actual running app**: Vite + React 19 + TypeScript SPA, Supabase backend, custom CSS.
- `docs/CLAUDE.md` and `docs/LIVAL_OS_Supabase_Vercel_App_Spec.md` describe a **different target architecture**: Next.js App Router, Tailwind + shadcn/ui, Vercel server routes. This was written before the backend decision settled on Supabase-as-is and was never implemented.
- `docs/PRD_Gap_Audit.md` (ChatGPT-generated) compares the actual codebase against the Next.js-based PRD and scores alignment at 68/100, flagging the framework mismatch as the single biggest risk.

The user's instructions for this work explicitly override the PRD's framework recommendation:

> Do not rebuild the whole app. Preserve working code wherever possible. Make the smallest safe changes needed to align the app with the PRD.

This resolves the audit's blocking question #1 ("port to Next.js now, or keep Vite SPA?") in favor of **keep Vite SPA**. This document scopes only Phase 0 (confirm + fix docs) and Phase 1 (additive Supabase schema). No UI pages are wired to new tables in this phase.

## Decisions

### 1. Framework: stay on Vite + React SPA

Not porting to Next.js. Rationale: this is a private single-user app with no SEO/crawler surface, so Next's main advantages (SSR/SSG, RSC) don't apply here. The one real gap — server-side ingestion routes (`/api/ingest/*`) and a service-role admin client — does not require a framework migration; it can be solved later with Vercel serverless functions or Supabase Edge Functions sitting alongside the static Vite build. That work is out of scope for Phase 0/1.

Env vars stay `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (not `NEXT_PUBLIC_*`).

### 2. No renames of existing tables — additive schema only

Comparing the PRD's recommended table list against the existing migration (`001_lival_os_initial_schema.sql`) surfaces two near-duplicates the gap audit didn't call out:

| PRD table | Existing table | Decision |
|---|---|---|
| `brain_dump_items` | `brain_dumps` | Already satisfied. Keep existing name — renaming would touch `src/lib/repository.ts`, `src/types.ts`, `src/App.tsx` for no functional gain. |
| `weekly_summaries` | `weekly_snapshots` | Already satisfied, same reasoning. |

No columns or table names in `001_lival_os_initial_schema.sql` are modified in Phase 1. This keeps the existing `SupabaseRepository`, `src/types.ts`, and `src/App.tsx` fully working with zero changes.

### 3. New tables to add (Phase 1 migration)

Tables in the PRD with no existing equivalent. All additive, all follow the conventions in `001_lival_os_initial_schema.sql` rather than the PRD's literal SQL (see "Convention choices" below):

1. **`task_updates`** — append-only history/notes log per task.
2. **`daily_plans`** — Must Do / Should Do / Could Do task-id arrays per day (feeds the Daily Planner, currently a UI skeleton with no persistence).
3. **`weekly_plans`** — outcomes / focus areas / open loops per week (feeds the Weekly Planner, currently a UI skeleton).
4. **`automation_runs`** — log of automation/ingestion runs (Claude Code, Codex, Apple Shortcuts, etc.), for future Phase 3/4 ingestion work.
5. **`integrations`** — per-provider config/status row (Claude Code, Codex, GitHub, Apple Shortcuts), for future ingestion work.
6. **`file_changes`** — tracks file edits attributed to a project/task, feeds the Task Detail "Files" tab. User explicitly opted to add this now (additive, avoids a second migration later) even though it's absent from the current automation-ready list in root `CLAUDE.md`.

### 4. Convention choices (deviating from the PRD's literal starter SQL to minimize diff)

| Aspect | PRD spec uses | This migration uses | Why |
|---|---|---|---|
| UUID generation | `uuid_generate_v4()` / `uuid-ossp` extension | `gen_random_uuid()` | `pgcrypto` is already enabled by migration 001; no new extension needed. |
| Status/type fields | Postgres `ENUM` types | `CHECK (...)` constraints | Matches every existing table in migration 001. Enums would be the only ones in the schema. |
| RLS policy shape | 4 separate policies per table (select/insert/update/delete) | 1 combined `for all` policy per table | Matches the existing pattern in migration 001 exactly. |
| `automation_runs.user_id` | nullable (for hypothetical system-level runs) | `not null` | Single-user app — every other table requires `user_id`; nullable would be the only exception and complicates RLS for no current benefit. |
| `file_changes` FK behavior | `on delete cascade` | `on delete set null` | Matches the existing optional-reference convention used by `time_entries.project_id`, `resources.project_id`, etc. |

### 5. Table field specs (for the implementation plan)

**`task_updates`**
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `task_id uuid not null references public.tasks(id) on delete cascade`
- `update_type text not null default 'note' check (update_type in ('note','status_change','time_logged','file_change','system'))`
- `body text not null`
- `source text not null default 'manual'`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- Index: `(task_id, created_at desc)`
- No `updated_at` (append-only log, matches PRD).

**`daily_plans`**
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `plan_date date not null`
- `must_do_task_ids uuid[] not null default '{}'`
- `should_do_task_ids uuid[] not null default '{}'`
- `could_do_task_ids uuid[] not null default '{}'`
- `notes text`
- `generated_by text`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` + trigger
- `unique (user_id, plan_date)`
- Index: `(user_id, plan_date)`

**`weekly_plans`**
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `week_start date not null`
- `outcomes text[] not null default '{}'`
- `focus_areas text[] not null default '{}'`
- `open_loops text[] not null default '{}'`
- `generated_by text`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` + trigger
- `unique (user_id, week_start)`

**`automation_runs`**
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `automation_name text not null`
- `source text`
- `status text not null default 'success' check (status in ('success','error','partial'))`
- `input_summary text`
- `output_summary text`
- `error_message text`
- `metadata jsonb not null default '{}'::jsonb`
- `started_at timestamptz not null default now()`
- `completed_at timestamptz`
- Index: `(user_id, started_at desc)`

**`integrations`**
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `provider text not null`
- `display_name text`
- `status text not null default 'active' check (status in ('active','disabled','error'))`
- `config jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` + trigger
- `unique (user_id, provider, display_name)`

**`file_changes`**
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `project_id uuid references public.projects(id) on delete set null`
- `task_id uuid references public.tasks(id) on delete set null`
- `file_path text not null`
- `change_type text check (change_type in ('created','modified','deleted','renamed'))`
- `repo_path text`
- `github_url text`
- `summary text`
- `source text not null default 'manual'`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- Indexes: `(project_id)`, `(task_id)`

All six tables: `alter table ... enable row level security;` + one policy each:

```sql
create policy <table>_owner_policy on public.<table>
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
```

Tables with `updated_at` get the existing trigger reused (already defined in migration 001, not redefined):

```sql
create trigger <table>_set_updated_at before update on public.<table>
  for each row execute function public.set_updated_at();
```

## Phase 0 deliverables (docs only, no schema/code changes)

1. **Confirm** (no file changes, reported in summary): framework is Vite 6 + React 19 + TypeScript SPA; structure is single `src/App.tsx` (1574 lines) + `src/lib/{supabase,repository,storage,metrics}.ts` + `src/data/seed.ts` + `src/types.ts`; env vars are `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, with `.env.example` already present and `.env.local` already gitignored.
2. **Fix root `/CLAUDE.md`**:
   - Correct the false claim "Tailwind CSS (inline via styles.css)" — verified via `package.json` and `src/styles.css` that there is no Tailwind/PostCSS dependency or config; styling is hand-written CSS custom properties.
   - Add a short note recording the framework decision and pointing at `docs/PRD_Gap_Audit.md` as the live remediation roadmap, marking `docs/CLAUDE.md` and `docs/LIVAL_OS_Supabase_Vercel_App_Spec.md` as a superseded target-architecture reference (Next.js/Tailwind), not the build plan.

## Phase 1 deliverables

1. New file `supabase/migrations/002_add_planning_and_integration_tables.sql` containing the six tables above, their indexes, RLS, and triggers, per the field specs in this document.
2. This migration is **drafted only** — not applied to the live Supabase project. No Supabase CLI link was found in this repo (`supabase/config.toml` absent, `supabase` CLI not installed), and migration 001 was applied manually via the Supabase dashboard SQL editor per existing project notes. The user applies migration 002 the same way, on their own schedule.
3. No existing tables, columns, or RLS policies are modified.
4. No application code (`src/**`) is touched — no repository methods, types, or UI wiring for the new tables in this phase.

## Explicitly out of scope for Phase 0/1

- Porting to Next.js, Tailwind, or shadcn/ui.
- Renaming `brain_dumps` → `brain_dump_items` or `weekly_snapshots` → `weekly_summaries`.
- Server-side ingestion endpoints, admin/service-role Supabase client, `LIVAL_INGEST_SECRET`.
- Wiring any UI page (Daily Planner, Weekly Planner, Task Detail Files tab, etc.) to the new tables.
- Applying migration 002 to the live database.
- Enum types, multi-policy RLS, or any other deviation from the migration-001 conventions.

## Validation

- Phase 0: no build-affecting changes; re-read updated `CLAUDE.md` for accuracy.
- Phase 1: SQL syntax review of the new migration file (no automated SQL linter in this repo); confirm no naming collisions with migration 001 objects (table names, trigger names, function name `public.set_updated_at`); confirm `npm run lint` / `npm run build` / `tsc -b` still pass since no `src/**` files change (regression check only).

## Next recommended phase (not in this scope)

Phase 2 per the audit's remediation plan: extract UI from the monolithic `src/App.tsx` into smaller components, expand Weekly Planner/Reports, and begin wiring the new Phase 1 tables (`daily_plans`, `weekly_plans`, `task_updates`) into the existing repository/UI layer.
