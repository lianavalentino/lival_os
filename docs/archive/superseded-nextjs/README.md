# Archive — rejected architectures

**Status: rejected. Do not build from these documents.**

Every file here describes an app that was never built. Together they are ~3,400 lines of
architecture guidance that contradicts the working code, which is why they were moved out of
the load path on 2026-08-02.

## The decision that killed them

`docs/superpowers/specs/2026-06-16-prd-phase0-1-alignment-design.md` — 2026-06-16, resolved on
explicit instruction to preserve working code and make the smallest safe changes:

> staying on Vite + React SPA — **not** porting to Next.js

## What is actually true

| | These docs claim | Reality |
|---|---|---|
| Framework | Next.js App Router | Vite 6 + React 19 SPA, state-based nav |
| Styling | Tailwind + shadcn/ui | hand-written CSS variables in `src/styles.css` |
| Ingestion | `app/api/ingest/*/route.ts` | 4 Supabase Edge Functions (Deno) |
| Admin client | `src/lib/supabase/admin.ts` | service role lives only in edge-function secrets — this file must never exist in a browser bundle |
| Deploy | Vercel | nowhere yet; open question |
| Env prefix | `NEXT_PUBLIC_*` | `VITE_*` |
| Charts | Recharts | none installed |

## Contents

| File | Why it is here |
|---|---|
| `SUPERSEDED-nextjs-agent-instructions.md` | Was `docs/CLAUDE.md` — the most dangerous file in the repo. Named `CLAUDE.md`, so any agent opening `docs/` loaded it as authoritative and got the wrong stack *and* the wrong secret name (`LIVAL_OS_INGEST_SECRET`; the live one is `LIVAL_INGEST_SECRET`). Renamed so it can never be auto-loaded again. |
| `LIVAL_OS_Supabase_Vercel_App_Spec.md` | 2,164 lines, the largest doc in the repo and the single biggest source of contradiction. Its starter SQL also diverges from the shipped migration — it prefers Postgres `ENUM`s where `001_lival_os_initial_schema.sql` deliberately uses `CHECK (...)`. |
| `PRD_Gap_Audit.md` | Was labelled "the live remediation roadmap" while telling you to install Tailwind and port to Next.js. **Harvest before discarding:** matrix rows 3, 4, 5, 6, 9, 10 and Risk #3 (client-side seed bootstrap) are real open product gaps that appear on no board. Its Phase 2–4 remediation steps are void. |
| `google_sheets_version/` | An earlier abandoned backend generation — three docs (993 + 845 + 808 lines) asserting "Google Sheets is the source of truth for MVP". Also reference a `LIVAL_OS_Backend_Architecture_Spec_Reconciled.md` that does not exist. |

## Not archived, still authoritative

- `docs/ingestion/README.md` — the most accurate integration doc in the repo
- `docs/superpowers/specs/` and `plans/` — a dated, immutable decision log
- root `CLAUDE.md` — the only doc that has always described the real system
