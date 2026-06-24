# LIVAL OS — CLAUDE.md

## Purpose
Private personal operating system: daily orientation, task capture, project visibility, weekly evidence. Single-user, self-owned.

## Stack
- Vite + React 19 + TypeScript
- Custom CSS (hand-written CSS variables in `src/styles.css` — no Tailwind, no PostCSS, no build-time CSS framework)
- Supabase (auth + Postgres) — project `LIVAL_OS`, ref `mfcdzgkhmzppfctdzhwy`
- `@supabase/supabase-js` v2.50+
- lucide-react icons, date-fns

## State
- Branch: `main` (Phase 0/1 PRD alignment merged 2026-06-23; App.tsx component extraction merged 2026-06-23 via PR #2)
- Supabase: connected. Migrations `001_lival_os_initial_schema.sql`, `002_add_planning_and_integration_tables.sql`, and `003_time_entries_external_ref_unique.sql` applied (001/002 dashboard-applied 2026-06-16, 003 applied via CLI). 6 new tables: task_updates, daily_plans, weekly_plans, automation_runs, integrations, file_changes; verified present.
- Planning tables wired (Phase 2 data layer): `task_updates`, `daily_plans`, `weekly_plans` load into `AppData` and are read+written by the Daily Planner, Weekly Planner, and Task Detail views (Approach A — snapshot-then-persist). `automation_runs` / `integrations` / `file_changes` remain unwired.
- Auth: email/password via Supabase Auth (enable in dashboard → Authentication → Providers → Email). User needs to create account on first run ("First setup? Create account").
- App runs on `npm run dev` → http://localhost:5173
- Phase 3 (ingestion) — DEPLOYED 2026-06-17: two Supabase Edge Functions (Deno) under `supabase/functions/` — `ingest-quick-capture` (→`inbox_items`, status `new`) and `ingest-time-entry` (→`time_entries`, `external_ref` idempotency). Auth: shared bearer `LIVAL_INGEST_SECRET`; `user_id` from `LIVAL_USER_ID` secret; service-role client. Deployed with `--no-verify-jwt` (bearer is the only gate). Secrets set via `supabase secrets set` (never committed; SUPABASE_URL/SERVICE_ROLE_KEY auto-provided to deployed fns). Migration `003_time_entries_external_ref_unique.sql` applied (partial unique index on `(user_id, external_ref)`). Producers: `docs/ingestion/README.md` (curl, Claude Code SessionStart/End hook, Apple Shortcut). 28/28 Deno tests pass.
- `ingest-file-change` (→`file_changes`) — DEPLOYED 2026-06-23 (`--no-verify-jwt`), live-verified (201 insert). Same bearer/service-role pattern; no idempotency key (`file_changes` has no unique constraint, re-posts insert new rows). Fields documented in `docs/ingestion/README.md`. Still deferred: `activity-event` endpoint, `automation_runs` logging, n8n. Supabase CLI linked; migrations 001/002/003 in CLI history.
- `ingest-activity-event` (→`activity_events`) — DEPLOYED 2026-06-23 (`--no-verify-jwt`), live-verified (201 insert). Same bearer/service-role pattern; no idempotency key (`activity_events` has no unique constraint). Fields documented in `docs/ingestion/README.md`. Closes Phase 3 ingestion scope except `automation_runs` logging and n8n wiring.
- Local edge-fn dev: `supabase/functions/.env.local` (gitignored) holds `LIVAL_INGEST_SECRET`/`LIVAL_USER_ID`/`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` for `supabase functions serve`. Run Deno tests: `cd supabase/functions && deno test --allow-env --allow-net`.
- Superpowers tracking: interactive kanban board at `docs/superpowers/kanban.html` — drag-drop tasks, browser localStorage persistence, export/reset. Replaces static KANBAN.md.

## PRD Alignment
- Framework decision (2026-06-16): staying on Vite + React SPA — **not** porting to Next.js. Resolved per explicit instruction to preserve working code and make the smallest safe changes.
- `docs/CLAUDE.md` and `docs/LIVAL_OS_Supabase_Vercel_App_Spec.md` describe a Next.js + Tailwind + shadcn/ui target architecture. Treat both as a superseded reference, not the active build plan.
- `docs/PRD_Gap_Audit.md` is the live remediation roadmap. See `docs/superpowers/specs/2026-06-16-prd-phase0-1-alignment-design.md` for the Phase 0/1 design and `supabase/migrations/002_add_planning_and_integration_tables.sql` for the Phase 1 schema additions.
- Phase 2 data-layer wiring: see `docs/superpowers/specs/2026-06-16-phase2-planning-tables-wiring-design.md` and `docs/superpowers/plans/2026-06-16-phase2-planning-tables-wiring.md`. UI extraction of `src/App.tsx` into `src/components/*` — DONE 2026-06-23: see `docs/superpowers/plans/2026-06-23-app-tsx-component-extraction.md`; `App.tsx` 1754→419 lines, 19 files extracted under `src/components/`.

## Env
`.env.local` (never commit):
```
VITE_SUPABASE_URL=https://mfcdzgkhmzppfctdzhwy.supabase.co
VITE_SUPABASE_ANON_KEY=<legacy anon JWT — from dashboard → Settings → API Keys → Legacy>
```
When env vars absent → falls back to local demo mode (localStorage, no auth).

## Architecture
- `src/lib/supabase.ts` — creates client; exports `hasSupabaseConfig` flag
- `src/lib/repository.ts` — `LocalDemoRepository` (demo) and `SupabaseRepository` (live). `SupabaseRepository.loadData()` bootstraps seed data on first login if `areas` table is empty.
- `src/lib/storage.ts` — localStorage layer for demo mode
- `src/lib/metrics.ts` — pure derivations over `AppData`
- `src/data/seed.ts` — seed data for first-time bootstrap
- `src/App.tsx` — `App` (repo selection: `hasSupabaseConfig` + session) + `LivalShell` (layout orchestration), 419 lines
- `src/components/` — `Sidebar`, `TopBar`, `BottomNav`, `CapturePanel`, `AuthGate`, `LoadingScreen`, `ui/primitives.tsx`, and 13 view components under `views/`
- `src/lib/view-helpers.ts` — shared view-layer helpers extracted from `App.tsx`
- `src/types.ts` — all TypeScript types

## Database
Schema in `supabase/migrations/001_lival_os_initial_schema.sql`.
Tables: `profiles`, `areas`, `workspaces`, `projects`, `tasks`, `time_entries`, `inbox_items`, `brain_dumps`, `resources`, `weekly_snapshots`, `activity_events`.
All tables have RLS; single-user policies (`user_id = auth.uid()`).

New API key format (`sb_publishable_...`) also available in dashboard → Settings → API Keys.

## Automation-ready
- `inbox_items` — Gmail, n8n, browser captures
- `brain_dumps` — Siri Shortcuts
- `time_entries` — Claude Code / Codex time capture
- `activity_events` — event log for weekly evidence

## Dev commands
```bash
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
```

## Gotchas
- `VITE_SUPABASE_ANON_KEY` must be the legacy JWT format (not the new `sb_publishable_` format) with current supabase-js version — legacy key works with both v1/v2 client flows.
- First user must click "First setup? Create account" to create a Supabase Auth account, then sign in. On first sign-in, seed data bootstraps automatically.
- Do not commit `.env.local`. Do not store service_role key anywhere in this repo.
