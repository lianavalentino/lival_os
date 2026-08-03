# LIVAL OS — Ingestion Endpoints

Four Supabase Edge Functions accept external writes authenticated by a shared
bearer secret (`LIVAL_INGEST_SECRET`). Base URL:

```
https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1
```

All requests send `Authorization: Bearer <LIVAL_INGEST_SECRET>` and
`Content-Type: application/json`.

## ingest-quick-capture → Inbox

```bash
curl -X POST \
  https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1/ingest-quick-capture \
  -H "Authorization: Bearer $LIVAL_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title":"Idea: weekly review automation","type":"idea","source":"shortcut"}'
```

Fields: `title` (required); optional `body`, `type`
(`email|appointment|idea|resource|note|task|other`, default `note`),
`source` (default `shortcut`), `source_url`, `received_at` (ISO8601),
`suggested_area_id`/`suggested_workspace_id`/`suggested_project_id` (uuid),
`confidence` (0–1). Row lands in the Inbox view with status `new`. Omit the
suggestion fields entirely when there's no routing guess — don't send
`null` (the schema treats them as optional, not nullable).

## ingest-time-entry → Time entries

```bash
curl -X POST \
  https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1/ingest-time-entry \
  -H "Authorization: Bearer $LIVAL_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"started_at":"2026-06-17T10:00:00Z","duration_minutes":45,"source":"claude_code","external_ref":"session-123"}'
```

Fields: `started_at` (required ISO8601), `duration_minutes` (required int ≥ 0);
optional `ended_at`, `project_id`, `task_id`, `description`,
`source` (`manual|codex|claude_code|shortcut|imported`, default `claude_code`),
`external_ref`. Passing the same `external_ref` twice returns the existing row
(no duplicate).

## ingest-file-change → File changes

```bash
curl -X POST \
  https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1/ingest-file-change \
  -H "Authorization: Bearer $LIVAL_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"file_path":"src/App.tsx","change_type":"modified","source":"claude_code","summary":"Extracted components"}'
```

Fields: `file_path` (required); optional `change_type`
(`created|modified|deleted|renamed`), `project_id`, `task_id`, `repo_path`,
`github_url`, `summary`, `source` (default `claude_code`), `metadata`
(arbitrary JSON object, default `{}`). No idempotency key — `file_changes`
has no unique constraint, so re-posting the same change inserts a new row.

## ingest-activity-event → Activity events

```bash
curl -X POST \
  https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1/ingest-activity-event \
  -H "Authorization: Bearer $LIVAL_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"entity_type":"task","event_type":"status_changed","message":"Task moved to Done"}'
```

Fields: `entity_type`, `event_type`, `message` (all required, free text — no
enum); optional `entity_id` (uuid), `metadata` (arbitrary JSON object,
default `{}`). No idempotency key — `activity_events` has no unique
constraint, so re-posting inserts a new row.

## Producer: Claude Code time tracking (hook)

Canonical scripts live in [`scripts/hooks/`](../../scripts/hooks/) — that is the only
copy to edit. `~/.claude/hooks/*.sh` are installed copies (copies, not symlinks: this
repo has moved once already and a symlink would have broken the hooks silently):

```bash
bash scripts/hooks/install.sh
```

Two hooks: `SessionStart` records the start time keyed by session id under
`/tmp/lival-sessions/<session-id>`; `SessionEnd` computes elapsed minutes and posts a
time entry. `install.sh` handles `chmod +x`. Register them in
`~/.claude/settings.json` (adjust paths):

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command", "command": "~/.claude/hooks/lival-session-start.sh" } ] }
    ],
    "SessionEnd": [
      { "hooks": [ { "type": "command", "command": "~/.claude/hooks/lival-session-end.sh" } ] }
    ]
  }
}
```

Export `LIVAL_INGEST_SECRET` so the hooks inherit it (see the caveat below).
`external_ref=$sid` makes re-runs idempotent.

### When the POST fails

The entry is **not** dropped. On anything other than a 2xx — endpoint down, no network,
wrong secret, timeout — `lival-session-end.sh` writes the payload to
`~/.claude/lival-spool/<session-id>.json` and still exits 0, so session teardown is never
blocked or noisy. The start file is removed only once the payload is either accepted or
safely spooled.

The spool lives under `~/.claude/`, not `/tmp`: `/tmp` is cleared on reboot and by
`periodic daily`, and a spool whose job is surviving a multi-day outage cannot live there.

Drain it once the endpoint is healthy:

```bash
bash scripts/hooks/lival-replay-spool.sh
```

It POSTs each spooled payload, deletes the file on 2xx, keeps it otherwise, and exits
non-zero if anything remains. Safe to re-run as often as you like — every spooled payload
carries `external_ref = <session-id>` and `ingest-time-entry` dedupes on it.

### Env vars

| Var | Purpose |
|---|---|
| `LIVAL_INGEST_SECRET` | required; bearer token |
| `LIVAL_INGEST_URL` | base URL override, default `https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1` |
| `LIVAL_SPOOL_DIR` | spool override, default `~/.claude/lival-spool` |
| `LIVAL_SESSION_DIR` | start-file override, default `/tmp/lival-sessions` |

The last two exist for the tests; production leaves them unset.

```bash
bash scripts/hooks/test-session-end.sh
```

Covers 2xx, 4xx, 5xx, unreachable host, sub-minute sessions, missing start file, and
replay in both directions, against a local stub server.

> **Secret inheritance caveat:** a `~/.zshrc` export only reaches hooks when
> Claude Code is launched from a terminal. GUI launches (VS Code extension,
> desktop app) do **not** source `~/.zshrc`, so the hook sees an empty secret
> and the POST 401s — recoverable now that failures spool, but every affected
> session has to be replayed by hand. For reliable inheritance across all launch
> contexts, also add the secret to `~/.claude/settings.json` under `env`:
>
> ```json
> { "env": { "LIVAL_INGEST_SECRET": "<secret>" } }
> ```
>
> `settings.json` is local (not in any repo) but persistent and plaintext —
> treat it as a credential store.

## Producer: Apple Shortcut (Siri quick capture)

1. New Shortcut → add **Text** action with your captured note (or "Ask Each Time").
2. Add **Get Contents of URL**:
   - URL: `https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1/ingest-quick-capture`
   - Method: `POST`
   - Headers: `Authorization` = `Bearer <your secret>`, `Content-Type` = `application/json`
   - Request Body: `JSON` → `title` = the Text, `type` = `idea`, `source` = `shortcut`
3. Name it "Add to LIVAL"; invoke with "Hey Siri, Add to LIVAL".

> Treat the bearer secret as a credential. Do not commit it or share the Shortcut export.
