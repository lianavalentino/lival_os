# ingest-activity-event Edge Function — Design

Date: 2026-06-23
Status: Approved (design)
Branch: none (direct to `main`, per size-based branch policy — single edge function, low blast radius)

## 1. Purpose

Phase 3's original design (`docs/superpowers/specs/2026-06-17-phase3-ingestion-edge-functions-design.md`,
section 8) deferred `file-change` and `activity-event` to "Phase 3.5+".
`file-change` shipped 2026-06-23 (`501b1e2`). This closes the remaining half
(kanban item 3-4): a fourth ingestion endpoint so external producers (Claude
Code, git hooks, CI, n8n) can log generic activity rows into `activity_events`
without exposing the service-role key.

## 2. Why no new ADR

Reuses the exact topology, security model, and error-response contract
established in the Phase 3 design doc — same Supabase project, same
`_shared/auth.ts` / `_shared/cors.ts` / `_shared/env.ts` / `_shared/supabase.ts`
helpers, same bearer-secret + service-role pattern, same handler/index/test
file layout as `ingest-file-change`. No new architectural decision required.

## 3. Endpoint contract

### POST /functions/v1/ingest-activity-event → `activity_events`

Request body:

```jsonc
{
  "entity_type": "string (required)",
  "event_type": "string (required)",
  "message": "string (required)",
  "entity_id": "uuid?",
  "metadata": "object (default {})"
}
```

- Table schema (`001_lival_os_initial_schema.sql:177-187`): `entity_type`,
  `event_type`, `message` are `not null` with no CHECK constraint (free-text,
  unlike `file_changes.change_type`) — no enum validation beyond
  "non-empty string".
- **No idempotency key.** `activity_events` has no unique constraint; every
  accepted request inserts a new row.
- Success: `201 → { "id": "<uuid>" }`.
- `metadata` stored as-is into the `jsonb` column.

### Error responses

Identical to the Phase 3 contract (`401` unauthorized, `400` validation,
`405` method not allowed, `500` internal) — see
`docs/superpowers/specs/2026-06-17-phase3-ingestion-edge-functions-design.md`
section 5.

## 4. File layout (mirrors `ingest-file-change`)

- `supabase/functions/ingest-activity-event/handler.ts` — zod schema,
  `toActivityEventRow`, `createActivityEventHandler`.
- `supabase/functions/ingest-activity-event/index.ts` — wires `readEnv` +
  `createServiceClient` + `client.from("activity_events").insert(...)`.
- `supabase/functions/ingest-activity-event/handler_test.ts` — same test
  shape as `ingest-file-change/handler_test.ts` (mapping/defaults, 401, 400×2,
  201×2).

## 5. Verification — definition of done

1. `deno test --allow-env --allow-net` passes for the new handler.
2. Deploy with `--no-verify-jwt`; curl against live; confirm `201` with a row
   `id`.
3. Delete the verification row (no standing test data in a personal-use
   table).
4. `docs/ingestion/README.md` documents the endpoint with a curl example.
5. `docs/superpowers/kanban.html` item `3-4` flipped to `done`.

## 6. Out of scope (still deferred)

- `automation_runs` run-logging.
- n8n producer wiring.
- Any UI surface reading `activity_events` (rows land in DB only; no
  Reports view yet).
