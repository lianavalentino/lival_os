# LIVAL OS — agent instructions

> **`CLAUDE.md` and `AGENTS.md` are the same file.** `AGENTS.md` is a symlink to this one.
> Both Claude Code and Codex work in this repo; edit either path, the other follows. Do not
> replace the symlink with a copy — two files means two truths within a week.

**Canonical scope lives in [`PRD.md`](PRD.md).** This file covers build state, environment,
and gotchas — the fast-moving half. `PRD.md` covers product, views, data model, and open
work. Its §19 is the map of which docs are canonical, reference, or historical; read that
before trusting anything in `docs/archive/`.

## Purpose
Private personal operating system: daily orientation, task capture, project visibility, weekly evidence. Single-user, self-owned.

**It is a daily-use ADHD tool, not a portfolio piece** (decided 2026-08-02). Features are
judged on whether they reduce friction between a thought and a recorded action.

**This repo is the only thing called LIVAL OS.** Two other systems shared the name until
2026-08-02 — a `TASKS.md`→Notion→HTML-artifact pipeline in `~/Developer/`, and the
`command-center-work-os` folder that fed it. Both were retired; their contents are in
`docs/archive/prototype-2026-06/`. The `lival-sync` and `lival-scope` skills were deleted with
them. Moved here from `~/Documents/LianaOS` on the same date.

## Where this connects
- **Supabase is the only system of record.** Project ref `mfcdzgkhmzppfctdzhwy`. Nothing else
  holds authoritative task state — no markdown file, no Google Sheet, no Notion database.
- **Inbound, live:** Claude Code session hooks (`~/.claude/hooks/lival-session-{start,end}.sh`)
  POST elapsed session time to the `ingest-time-entry` edge function on every session end.
  These are global hooks in `~/.claude/settings.json`, not repo-local — they survive
  independently of this directory and are keyed to the Supabase URL, not to a filesystem path.
  **Claude Code only.** `time_entries.source` accepts `codex`, but no Codex-side hook exists —
  Codex sessions in this repo are currently untracked. Build one or log manually.
- **Inbound, next:** an Apple Shortcut POSTing to `ingest-quick-capture` — home screen, Siri,
  and share sheet. This is the primary capture path. See `PRD.md` §11.2.
- **Inbound, deferred:** Notion as a phone-first **capture source** read *from*, never a
  mirror written *to*. Transport is Supabase `pg_cron` + `pg_net` calling an edge function.
  **n8n is rejected** (decided 2026-08-02). Current design:
  `docs/superpowers/specs/2026-08-02-notion-capture-poller-design.md`. The older
  `2026-06-24-n8n-gmail-capture-design.md` is historical — its transport no longer applies,
  though its write-side change to `ingest-quick-capture` was built and is live. Build is
  gated on two weeks of Shortcut-only capture; see `PRD.md` §11.3.
  **Before building it, read §5 of the design doc** — `inbox_items` has no idempotency key,
  so a poller written against the endpoint as it stands today will duplicate Inbox rows.
- **Not connected to:** `personal/kanban/` (a separate scaffold, never built) or any
  `TASKS.md` roll-up. If you find a doc claiming otherwise, it predates 2026-08-02.
- **Secrets:** `LIVAL_INGEST_SECRET` lives in `~/.claude/settings.json` env (for the hooks) and
  in Supabase function secrets (for the functions). Never in this repo.

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
- `PRD.md` (repo root, written 2026-08-02) is the single canonical PRD. It supersedes `LIVAL_OS_Codex_PRD_v1.md` (now `docs/archive/superseded-prds/`) and every PRD in `docs/archive/`. Reasoning behind its scope calls is in `docs/decisions/2026-08-02-scope-reset.md`.
- `docs/LIVAL_OS_Frontend_Artifact_Spec_V4_1.md` stays in the active tree as widget-level layout **reference** only — it carries a banner listing where it diverges from `PRD.md`.
- All 6 `specs/` and 7 `plans/` carry HISTORICAL banners. They are a dated, immutable decision log; never edit them to match current state.
- Framework decision (2026-06-16): staying on Vite + React SPA — **not** porting to Next.js. Resolved per explicit instruction to preserve working code and make the smallest safe changes.
- Every doc describing a Next.js + Tailwind + shadcn/ui + Vercel target was moved to `docs/archive/superseded-nextjs/` on 2026-08-02 — including the former `docs/CLAUDE.md`, which was being auto-loaded as authoritative and carried the wrong secret name. See that folder's README before reading anything in it.
- The former `docs/PRD_Gap_Audit.md` is archived too. It is **not** a roadmap — its remediation phases assume the rejected Next.js port. Its six real product gaps and Risk #3 (client-side seed bootstrap) were all decided on 2026-08-02 and are now tracked in `PRD.md` §17.
- See `docs/superpowers/specs/2026-06-16-prd-phase0-1-alignment-design.md` for the Phase 0/1 design and `supabase/migrations/002_add_planning_and_integration_tables.sql` for the Phase 1 schema additions.
- `docs/archive/prototype-2026-06/` holds the retired file→Notion→artifact generation, archived from `~/Developer/` where it had no version control.
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
