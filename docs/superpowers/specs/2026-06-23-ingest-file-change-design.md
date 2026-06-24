# ingest-file-change Edge Function — Design

Date: 2026-06-23
Status: Approved (design) — written retroactively; implementation already shipped same day (commit `501b1e2`)
Branch: none (direct to `main`, per size-based branch policy)

## 1. Purpose

Phase 3's original design (`docs/superpowers/specs/2026-06-17-phase3-ingestion-edge-functions-design.md`,
section 8) explicitly deferred `file-change` and `activity-event` to "Phase 3.5+".
This closes the `file-change` half of that gap (kanban item 3-3): a third
ingestion endpoint so external producers (Claude Code, git hooks, CI) can log
rows into `file_changes` without exposing the service-role key.

## 2. Why no new ADR

This reuses the exact topology, security model, and error-response contract
established in the Phase 3 design doc — same Supabase project, same
`_shared/auth.ts` / `_shared/cors.ts` / `_shared/supabase.ts` helpers, same
bearer-secret + service-role pattern. No new architectural decision required;
this section exists only to record that the prior design was re-applied, not
re-litigated.

## 3. Endpoint contract

### POST /functions/v1/ingest-file-change → `file_changes`

Request body:

```jsonc
{
  "file_path": "string (required)",
  "change_type": "created|modified|deleted|renamed  (optional)",
  "project_id": "uuid?",
  "task_id": "uuid?",
  "repo_path": "string?",
  "github_url": "string?",
  "summary": "string?",
  "source": "string (default 'claude_code')",
  "metadata": "object (default {})"
}
```

- **No idempotency key.** Unlike `time_entries`, the `file_changes` table
  (migration 002) has no unique constraint — every accepted request inserts a
  new row. Re-posting the same change is a caller concern, not this
  endpoint's.
- Success: `201 → { "id": "<uuid>" }`.
- `change_type`, when present, must satisfy the existing `file_changes` CHECK
  constraint (`created|modified|deleted|renamed`); a `metadata` value is
  stored as-is into the `jsonb` column.

### Error responses

Identical to the Phase 3 contract (`401` unauthorized, `400` validation,
`405` method not allowed, `500` internal) — see
`docs/superpowers/specs/2026-06-17-phase3-ingestion-edge-functions-design.md`
section 5.

## 4. Verification — definition of done

1. `deno test --allow-env --allow-net` passes for the new handler (6 tests:
   row mapping + defaults, 401, 400×2, 201×2).
2. Deploy with `--no-verify-jwt`; curl against live; confirm `201` with a row
   `id`.
3. Delete the verification row (no standing test data in a personal-use
   table).
4. `docs/ingestion/README.md` documents the endpoint with a curl example.

## 5. Out of scope (still deferred)

- `activity-event` ingestion endpoint (kanban 3-4).
- `automation_runs` run-logging.
- n8n producer wiring.
- Any UI surface reading `file_changes` (rows land in DB only; no Reports
  view yet).
