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
- Branch: `supabase-setup` (working branch as of 2026-06-16)
- Supabase: connected. Migration `001_lival_os_initial_schema.sql` applied.
- Auth: email/password via Supabase Auth (enable in dashboard → Authentication → Providers → Email). User needs to create account on first run ("First setup? Create account").
- App runs on `npm run dev` → http://localhost:5173

## PRD Alignment
- Framework decision (2026-06-16): staying on Vite + React SPA — **not** porting to Next.js. Resolved per explicit instruction to preserve working code and make the smallest safe changes.
- `docs/CLAUDE.md` and `docs/LIVAL_OS_Supabase_Vercel_App_Spec.md` describe a Next.js + Tailwind + shadcn/ui target architecture. Treat both as a superseded reference, not the active build plan.
- `docs/PRD_Gap_Audit.md` is the live remediation roadmap. See `docs/superpowers/specs/2026-06-16-prd-phase0-1-alignment-design.md` for the Phase 0/1 design and `supabase/migrations/002_add_planning_and_integration_tables.sql` for the Phase 1 schema additions.

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
- `src/App.tsx` — all views; picks repo based on `hasSupabaseConfig` + session
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
