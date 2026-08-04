# The Friday weekly review runs in Postgres, not in an edge function

Every input and output of the weekly review — `tasks`, `time_entries`, `areas`,
`weekly_snapshots`, `activity_events`, `automation_runs` — lives in the same Supabase
Postgres database. So `pg_cron` calls a `plpgsql` function directly. There is no edge
function, no `pg_net`, no service-role hop, and no shared bearer secret in the path.
Compute, upsert, event-write and run-log all happen in one transaction, which is what makes
the automation-run record trustworthy rather than best-effort.

Decided 2026-08-04.

## Considered options

- **`pg_cron` + `pg_net` → a fifth Deno edge function.** This is the transport §11.3 picked
  for the Notion poller, so it looked like the consistent choice. Its real selling point was
  reusing the already-tested `src/lib/weekly-review.ts` so the momentum math would exist
  once. It does not deliver that: `supabase functions deploy` bundles from inside
  `supabase/functions/`, `_shared/` is the sanctioned way to share, and imports reaching
  outside that tree are not reliably bundled. Getting there means moving the module into
  `_shared/` and having Vite import it back out, with `date-fns` resolving differently under
  Deno and Vite. Real work, for a benefit the fixture below buys more cheaply.
- **Vercel Cron.** Disqualified rather than merely ranked lower: it needs
  `SUPABASE_SERVICE_ROLE_KEY` present in the Vercel project, which is the exact credential
  we are removing from there. Hobby-tier cron is also daily-granularity.
- **Repoint the existing `~/Claude/Scheduled/lival-weekly-review-friday` job at Supabase.**
  Cheapest by hours, and rejected on reliability. It requires the Mac awake with Claude
  running, and it is a language model doing arithmetic a `select` should do. PRD §14.2 makes
  a silent scheduled failure a P1 defect and R5 records that exact failure already costing
  six weeks; this is the hardest option to make fail loudly.

## Consequences

The momentum formula now exists twice — once in SQL for the scheduled snapshot, once in
TypeScript for the live Reports view. That drift risk is not hypothetical: the TypeScript
implementation had already drifted from PRD §12.2 by filtering tasks on status alone and
never scoping them to the week.

Mitigation is a **shared test vector** — one JSON file of cases, including §12.2's worked
example of 3 closed of 6 planned scoring 50 — asserted by both the vitest suite and the SQL
test. Sharing the vector rather than the code keeps the Deno/Vite boundary out of it. The
SQL side has a home already: migration 004 established a `postgres:15` fixture harness.
