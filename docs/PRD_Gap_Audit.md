## LIVAL OS — PRD Gap Audit

Date: 2026-06-16

### 1. Executive Summary

- Alignment Score: **68 / 100** — The current app implements the full UI surface, seed/demo flows, and a Supabase migration, but differs from the PRD on framework (Vite SPA vs Next.js App Router), server-side patterns (no server admin client or ingestion routes), and UI stack (no Tailwind/shadcn). Treat PRD as source of truth for architecture.

### 2. Biggest Risks

- Framework mismatch (Next.js required by PRD; repo is Vite SPA). See: `docs/LIVAL_OS_Supabase_Vercel_App_Spec.md` and `package.json`.
- No server-side ingestion endpoints or service-role admin client — blocks automated ingestion and secure writes.
- Client-side seed/bootstrap/upserts are executed from browser code — non-ideal for admin operations.
- Styling and component system (Tailwind/shadcn) missing — visual parity will need rework.

### 3. What is already good and should not be rebuilt

- Complete UI surface implemented in `src/App.tsx` (Command Center, Board, Projects, Inbox, Brain Dump, Resources, Reports, Archive, Settings).
- Supabase schema migration exists with core tables + RLS: `supabase/migrations/001_lival_os_initial_schema.sql`.
- Robust seed/demo support: `src/data/seed.ts`, `src/lib/storage.ts`, `LocalDemoRepository`.
- Repository abstraction: `src/lib/repository.ts` centralizes DB access and mapping.

### 4. Architecture Comparison

- PRD: Next.js App Router, server components, server-side Supabase admin client, protected ingestion endpoints, Vercel deployment.
- Current: Vite + React SPA; single `src/App.tsx` renders pages; browser-only Supabase client in `src/lib/supabase.ts`.

### 5. Current backend / data layer

- Migration file includes core tables and RLS (`profiles`, `areas`, `workspaces`, `projects`, `tasks`, `time_entries`, `inbox_items`, `brain_dumps`, `resources`, `weekly_snapshots`, `activity_events`) — see `supabase/migrations/001_lival_os_initial_schema.sql`.
- `SupabaseRepository` reads/writes directly from the browser client and contains seed upsert logic.

### 6. Current auth approach

- Supabase Auth client-side using anon key. Login UI in `AuthGate` (email/password). Profile upsert is performed client-side via `SupabaseRepository.ensureProfile()`.

### 7. Current deployment assumptions

- Local dev: Vite (`npm run dev`). Env vars are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` per `CLAUDE.md` and `src/lib/supabase.ts`.
- PRD expects `NEXT_PUBLIC_*` env naming and Vercel production. Migration needed for env naming and build system.

### 8. Differences from the PRD

- Framework: PRD demands Next.js App Router + server routes; repo is Vite SPA.
- Ingestion endpoints and server admin client are missing.
- UI stack (Tailwind + shadcn) not present.
- Some PRD tables and views are absent from migration (see DB Gap Analysis).

---

### 9. Feature Coverage Matrix

| PRD Requirement | Current implementation status | Evidence (codebase) | Evidence (PRD/spec) | Priority | Recommended action |
|---|---:|---|---|---:|---|
| Command Center | Complete | `src/App.tsx` (CommandCenter component) | `docs/LIVAL_OS_Frontend_Artifact_Spec_V4_1.md` | P0 | Keep; port to Next.js pages/components.
| Daily Planner | Complete (UI) | `src/App.tsx` (DailyPlanner) | Frontend artifact | P0 | Keep; port.
| Weekly Planner | Partial | `src/App.tsx` (WeeklyPlanner skeleton) | Weekly Calendar required | P1 | Implement calendar widget.
| Board | Complete (UI) | BoardView usage in `src/App.tsx` | Board page spec | P0 | Add dnd-kit for drag/drop.
| Projects & Project Detail | Partial | `ProjectsView` and `ProjectDetail` referenced | Project detail tabs + time | P1 | Expand tabs and charts.
| Task Detail | Complete (basic) | `TaskDetail` referenced | Task detail spec with time widget | P0 | Add time widget enhancements.
| Inbox / Convert flows | Complete | `InboxView` and `convertInboxItem` in `src/lib/repository.ts` | Inbox spec | P0 | Keep; port server-side conversion.
| Brain Dump | Complete | `BrainDumpView` & demo convert flows | Brain Dump spec | P1 | Keep; port.
| Resources | Complete | `ResourcesView` referenced | Resources spec | P1 | Add filters/search.
| Reports / Weekly Win Log | Partial | `ReportsView` placeholder | Detailed reporting + charts | P1 | Implement Recharts views and compute metrics.
| Auth (MVP) | Complete | `AuthGate` uses Supabase client | PRD MVP auth | P0 | Keep; add server protections after port.
| Supabase schema & RLS | Mostly Complete | `supabase/migrations/001_lival_os_initial_schema.sql` | PRD starter schema | P0 | Add missing tables/views (see DB Gap Analysis).
| Ingestion endpoints | Missing | No `api/ingest` routes | Required by PRD | P0 | Add server route handlers protected by `LIVAL_INGEST_SECRET`.
| Server admin client | Missing | No admin client file | PRD `admin.ts` required | P0 | Add `src/lib/supabase/admin.ts` using service role.
| Tailwind + shadcn/ui | Missing | No Tailwind/shadcn deps | PRD UI stack | P1 | Decide to port styling or adapt UI.

---

### 10. Current implementation status summary

- Many pages exist as UI components inside `src/App.tsx` (good). Core server features (ingest routes, admin client, centralized query layer, server-only seed migration) are missing or implemented client-side (seed upserts in browser).

### 11. Evidence from current codebase (selected)

- `src/App.tsx`: full UI and navigation; `CommandCenter`, `BoardView`, `ProjectDetail`, `TaskDetail`, `InboxView`, `ReportsView`, etc. — demonstrates page coverage.
- `src/lib/supabase.ts`: browser client init using `VITE_SUPABASE_*` env vars.
- `src/lib/repository.ts`: `SupabaseRepository` client-side upserts, `bootstrapSeedData()` logic, mapping functions.
- `supabase/migrations/001_lival_os_initial_schema.sql`: migration + RLS policies.

### 12. Evidence from PRD/spec (selected)

- `docs/LIVAL_OS_Supabase_Vercel_App_Spec.md`: requires Next.js App Router, server admin client, ingestion endpoints, RLS, view/query layers, PRD file list and environment variable naming.
- `docs/LIVAL_OS_Frontend_Artifact_Spec_V4_1.md`: approved visual artifact and page list.

### 13. Priority definitions used

- P0 = must-have for MVP or security
- P1 = important for parity with PRD
- P2 = nice-to-have / later polish

---

### 14. Recommended action (high-level)

- Short term: preserve existing SPA and behavior; add server admin client + ingestion endpoints as minimal server routes (to enable secure ingestion). Remove client-side seed repairs once server-side script exists.
- Medium term: port UI to Next.js App Router, extract components, add Tailwind/shadcn, implement server-side query layer and server actions.
- Long term: full Vercel deployment, CI, exports, and integrations.

---

### 15. Database and Supabase Gap Analysis (detailed)

- Present in migration: `profiles`, `areas`, `workspaces`, `projects`, `tasks`, `time_entries`, `inbox_items`, `brain_dumps`, `resources`, `weekly_snapshots`, `activity_events` (good). See `supabase/migrations/001_lival_os_initial_schema.sql`.
- Missing tables that PRD recommends: `task_updates`, `automation_runs`, `integrations`, `daily_plans`, `weekly_plans` (some of these appear in PRD starter schema but not in current migration). Add as new migration drafts.
- Column/enums: PRD prefers Postgres ENUM types for statuses; current migration uses `CHECK(...)`. Functionally okay but enums may be preferable for typed queries and migration clarity.
- Seed data: currently applied via client-side `SupabaseRepository.bootstrapSeedData()` (unsafe for admin flows). Move seed upserts to server-side migration or admin script.

### 16. Identify missing tables/columns/relationships

- Add `task_updates` table (history/comments), `automation_runs`, `integrations`, and `daily_plans` if PRD requires them.
- Confirm `task_updates` FK to `tasks(id)`, `automation_runs` FK to `profiles(id)` optional, `integrations` should include provider/config JSON.

### 17. Do not write SQL yet — audit only

No SQL changes will be executed in this audit. Recommend drafting a migration file after you approve Phase 1.

---

### 18. Frontend / UI Gap Analysis

- Routes: PRD requires file-based Next.js App Router. Current SPA uses internal state for views — must be ported.
- Components: PRD recommends componentized layout under `src/components/`; current code is monolithic in `src/App.tsx`.
- Charts and drag/drop: PRD expects `recharts` and `dnd-kit` — not present in `package.json`.
- Styling: PRD uses Tailwind + shadcn; current CSS is custom (`src/styles.css`).

### 19. Missing screens and UI mismatches

- Weekly Planner's large Weekly Calendar (PRD) may be under-implemented.
- Exports, weekly summary export, and Momentum score visualizations need implementation.

### 20. Implementation Risk List

- Porting to Next.js is non-trivial (restructure, routing, SSR concerns).
- Client-side admin operations must be moved server-side to avoid privilege/exposure.
- Env var naming mismatch will cause deployment confusion; migrate to `NEXT_PUBLIC_*` for public keys and `SUPABASE_SERVICE_ROLE_KEY` for server.

### 21–24. Recommended Remediation Plan (Phases & file-level change guidance)

- Phase 0: Preserve what exists
  - Files to keep: `src/App.tsx`, `src/data/seed.ts`, `src/lib/storage.ts`, `src/lib/repository.ts` (demo flows). No changes.

- Phase 1: Fix architecture/data model (server admin + queries)
  - Add `src/lib/supabase/admin.ts` (service role admin client) — server-only.
  - Add `src/lib/db/queries.ts` and `src/lib/db/mutations.ts` for centralized queries.
  - Add migration drafts: `supabase/migrations/002_add_task_updates_and_integrations.sql` (draft only).
  - Remove/disable client-side seed repair; replace with `scripts/bootstrap_seed.ts` that uses admin client.

- Phase 2: Align core pages (port UI)
  - Add Next.js app skeleton: `src/app/layout.tsx`, `src/app/page.tsx`, pages under `src/app/command-center/page.tsx`, etc.
  - Extract UI parts from `src/App.tsx` into `src/components/*` (app-shell, sidebar, top-header, widgets).
  - Add Tailwind config, install `shadcn/ui`, add `src/styles/globals.css`.

- Phase 3: Connect Supabase fully
  - Add server ingestion routes: `src/app/api/ingest/quick-capture/route.ts`, `.../time-entry/route.ts`, `.../file-change/route.ts`, `.../activity-event/route.ts` verifying `LIVAL_INGEST_SECRET`.
  - Implement server actions / server components to call query/mutation layer.

- Phase 4: Deploy to Vercel
  - Update `.env.example` and docs to use `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LIVAL_INGEST_SECRET`, `NEXT_PUBLIC_APP_URL`.
  - Add `vercel.json` or Vercel deployment notes, validate build, and set envs in Vercel project.

### 25. Questions Before Editing (blocking)

1. Framework decision: port to Next.js now, or keep Vite SPA and add server-side routes first? (This determines Phase 2 scope.)
2. Will you provide `SUPABASE_SERVICE_ROLE_KEY` in Vercel for server admin client, or should we rely on local scripts first?
3. Confirm deployment target is Vercel (PRD default) or give alternate host.

If none of these block you, reply “No blocking questions.”

---

### 26. Appendices / References

- Current code: `src/App.tsx`, `src/lib/repository.ts`, `src/data/seed.ts`, `supabase/migrations/001_lival_os_initial_schema.sql`.
- PRD/specs: `docs/LIVAL_OS_Supabase_Vercel_App_Spec.md`, `docs/LIVAL_OS_Frontend_Artifact_Spec_V4_1.md`.

---

Generated by audit run on local workspace.
