# LIVAL OS — Ingestion Endpoints

Three Supabase Edge Functions accept external writes authenticated by a shared
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
`source` (default `shortcut`), `source_url`, `received_at` (ISO8601).
Row lands in the Inbox view with status `new`.

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

## Producer: Claude Code time tracking (hook)

Two hooks: `SessionStart` records the start time keyed by session id;
`SessionEnd` computes elapsed minutes and posts a time entry. Add to
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

`~/.claude/hooks/lival-session-start.sh`:
```bash
#!/usr/bin/env bash
input=$(cat)
sid=$(printf '%s' "$input" | /usr/bin/python3 -c 'import sys,json;print(json.load(sys.stdin).get("session_id","unknown"))')
mkdir -p /tmp/lival-sessions
date +%s > "/tmp/lival-sessions/$sid"
```

`~/.claude/hooks/lival-session-end.sh`:
```bash
#!/usr/bin/env bash
input=$(cat)
sid=$(printf '%s' "$input" | /usr/bin/python3 -c 'import sys,json;print(json.load(sys.stdin).get("session_id","unknown"))')
startfile="/tmp/lival-sessions/$sid"
[ -f "$startfile" ] || exit 0
start_epoch=$(cat "$startfile")
end_epoch=$(date +%s)
minutes=$(( (end_epoch - start_epoch) / 60 ))
[ "$minutes" -lt 1 ] && exit 0
started_iso=$(date -u -r "$start_epoch" +%Y-%m-%dT%H:%M:%SZ)
curl -s -X POST \
  "https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1/ingest-time-entry" \
  -H "Authorization: Bearer $LIVAL_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"started_at\":\"$started_iso\",\"duration_minutes\":$minutes,\"source\":\"claude_code\",\"external_ref\":\"$sid\"}" >/dev/null
rm -f "$startfile"
```

Make both executable (`chmod +x`) and export `LIVAL_INGEST_SECRET` in your shell
profile so the hooks inherit it. `external_ref=$sid` makes re-runs idempotent.

> **Secret inheritance caveat:** a `~/.zshrc` export only reaches hooks when
> Claude Code is launched from a terminal. GUI launches (VS Code extension,
> desktop app) do **not** source `~/.zshrc`, so the hook sees an empty secret
> and the POST silently 401s. For reliable inheritance across all launch
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
