# Phase 3 — Secure Ingestion via Supabase Edge Functions

Date: 2026-06-17
Status: Approved (design)
Branch: TBD (create `feat/phase3-ingestion` for implementation)

## 1. Purpose

LIVAL OS is meant to be an automation-fed personal OS: work sessions, captures,
and activity flow in from external producers (Claude Code, Apple Shortcuts/Siri,
n8n, Gmail). Today nothing can write to Supabase except the authenticated browser
client, so the automation tables stay empty.

Phase 3 adds the first **secure server-side ingestion endpoints** so external
producers can insert rows safely, without exposing the service-role key and
without porting the app to Next.js.

Scope this phase: **two endpoints** — `quick-capture` and `time-entry`. They have
the highest near-term value (mobile/voice capture; automatic time tracking) and a
clear verification path (quick-captured items render in the existing Inbox view).

## 2. Why Supabase Edge Functions

The app is a Vite + React SPA (decision recorded 2026-06-16: stay on Vite, do
**not** port to Next.js). A SPA has no server, so it cannot hold the ingest secret
or the service-role key, and cannot bypass RLS for trusted writes.

Supabase Edge Functions (Deno) solve this with the smallest footprint:

- Run inside the existing Supabase project (`mfcdzgkhmzppfctdzhwy`) — no new host,
  no Vercel, no framework migration.
- Service-role key is available server-side only, via function secrets.
- Free tier covers single-user volume by orders of magnitude.

Alternatives considered and rejected:

- **Next.js API routes** — requires the framework port already rejected.
- **Vercel serverless functions** — adds a second host and deploy pipeline for no
  benefit over Edge Functions.
- **PostgREST + anon key direct** — cannot satisfy the trusted-write / shared-secret
  model; RLS would block unauthenticated producers.

## 3. Cost

No new paid services. Supabase Edge Functions free tier (~500K invocations/month)
vastly exceeds single-user usage (dozens/day). Apple Shortcuts, the Claude Code
hook (a local curl), and the existing self-hosted n8n are all free. Note: free-tier
Supabase projects pause after ~7 days of inactivity; this project is active.

## 4. Architecture

### Topology

Two independent functions, one per endpoint:

```
supabase/functions/
  _shared/
    auth.ts        # bearer-secret verification
    cors.ts        # OPTIONS preflight + CORS headers (Shortcut/n8n)
    supabase.ts    # service-role client factory
  ingest-quick-capture/index.ts
  ingest-time-entry/index.ts
docs/ingestion/
  README.md        # curl examples, Claude Code hook script, Shortcut setup
```

Separate functions (not one router function with sub-paths) so each has
independent deploys, logs, and a contract that mirrors the PRD's per-endpoint
layout.

### Security model

- **Shared secret**: `LIVAL_INGEST_SECRET`, sent by callers as
  `Authorization: Bearer <secret>`. The function verifies it before any DB access
  and returns `401` on missing/incorrect secret. A single shared secret is
  sufficient for a single-user system; per-source secrets are out of scope.
- **user_id resolution**: function secret `LIVAL_USER_ID` holds the one auth user
  UUID. Inserts set `user_id` explicitly.
- **Service-role client**: built inside the function from `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` function secrets. Service role bypasses RLS, so the
  explicit `user_id` is what establishes ownership. The key never reaches the
  browser.
- **Secrets storage**: set via `supabase secrets set`. Never committed, never
  placed in `.env.local` (Vite exposes `VITE_*` to the browser bundle).
- **Validation**: each endpoint validates its body with Zod (Deno-compatible
  import). Invalid body → `400` with field-level errors, no partial writes.
- **CORS**: handle `OPTIONS` preflight and return permissive CORS headers so
  browser-originated callers (n8n, future web producers) and Shortcuts work.

## 5. Endpoint contracts

### POST /functions/v1/ingest-quick-capture → `inbox_items`

Request body:

```jsonc
{
  "title": "string (required)",
  "body": "string?",
  "type": "email|appointment|idea|resource|note|task|other  (default 'note')",
  "source": "string (default 'shortcut')",
  "source_url": "string?",
  "received_at": "ISO8601?  (default now())"
}
```

- Inserts with `status='new'` so the row appears in the existing Inbox view.
- Success: `201 → { "id": "<uuid>", "status": "new" }`.
- No dedup (cheap rows; manual Inbox review catches duplicates).

### POST /functions/v1/ingest-time-entry → `time_entries`

Request body:

```jsonc
{
  "started_at": "ISO8601 (required)",
  "ended_at": "ISO8601?",
  "duration_minutes": "int >= 0 (required)",
  "project_id": "uuid?",
  "task_id": "uuid?",
  "description": "string?",
  "source": "claude_code|codex|shortcut|manual|imported (default 'claude_code')",
  "external_ref": "string?"
}
```

- **Idempotency**: if `external_ref` is present and a `time_entries` row already
  exists for `(user_id, external_ref)`, return that existing row with `200` instead
  of inserting a duplicate. (Hooks can double-fire; this makes retries safe.)
  Otherwise insert and return `201 → { "id": "<uuid>" }`.
- `source` must satisfy the existing `time_entries` CHECK constraint
  (`manual|codex|claude_code|shortcut|imported`).

### Error responses (both endpoints)

| Status | Cause | Body |
|---|---|---|
| 401 | Missing/incorrect bearer secret | `{ "error": "unauthorized" }` |
| 400 | Zod validation failure | `{ "error": "validation", "issues": [...] }` |
| 405 | Method not POST (after OPTIONS) | `{ "error": "method_not_allowed" }` |
| 500 | DB/insert error | `{ "error": "internal" }` (details logged server-side only) |

Never leak service-role or DB internals to the caller.

## 6. Producers (verification + first real callers)

Build contract-first and verify with curl, then wire one real producer per
endpoint to prove the path end-to-end.

- **time-entry → Claude Code hook**: a `SessionEnd`/`Stop` hook script posts session
  duration + project. The PRD's headline automation; low effort (a shell script
  doing a curl with the bearer secret). Documented in `docs/ingestion/README.md`.
- **quick-capture → Apple Shortcut**: a Shortcut ("Hey Siri, add to LIVAL") posts a
  note/idea to the inbox. Easiest real mobile/voice capture, no infra.
- **n8n → quick-capture**: deferred. Already self-hosted; more moving parts than the
  Shortcut and not needed to prove the path.

## 7. Verification — Phase 3 definition of done

1. `supabase functions serve` locally; curl both endpoints covering 401 (bad/missing
   secret), 400 (invalid body), and success cases.
2. Deploy both functions; curl against live; confirm rows via SQL.
3. A quick-capture row is visible in the existing Inbox UI without code changes.
4. time-entry idempotency: posting the same `external_ref` twice yields one row.
5. Claude Code `SessionEnd` hook produces a real `time_entries` row.
6. Apple Shortcut produces a real `inbox_items` row.

## 8. Out of scope (deferred to Phase 3.5+)

- `file-change` and `activity-event` ingestion endpoints.
- `automation_runs` run-logging.
- New Reports / time-tracking UI surfaces (time_entries rows land in DB; no new
  view this phase).
- n8n producer wiring.
- Component extraction of `src/App.tsx` (tracked separately as standing debt).

## 9. Risks / notes

- **Secret distribution**: the bearer secret must be placed on each producer
  (Claude Code hook env, Shortcut). Document clearly; treat as a credential.
- **Clock/timezone**: producers send ISO8601 timestamps; functions store as
  `timestamptz`. The Claude Code hook should emit UTC ISO strings.
- **Free-tier pause**: if the project ever idles >7 days, the first ingestion after
  wake may be slow/fail until the project resumes; acceptable for personal use.
- **No new migration required**: all target tables (`inbox_items`, `time_entries`)
  already exist from migration 001.
