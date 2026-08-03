# Session Time-Tracking Hook Durability — Design

**Date:** 2026-08-02
**Status:** approved, ready to implement

## Problem

`~/.claude/hooks/lival-session-end.sh` discards a session's tracked time whenever the
POST to `ingest-time-entry` fails.

```bash
curl -s -X POST "https://…/functions/v1/ingest-time-entry" … >/dev/null   # line 12-16
rm -f "$startfile"                                                        # line 17
```

`curl -s` without `--fail`, no status capture, no exit-code check, and an unconditional
`rm` on the next line. Any failure — paused/deleted Supabase project, no network, wrong
secret, 5xx — exits 0 and the entry is gone permanently.

**This is live right now.** `mfcdzgkhmzppfctdzhwy.supabase.co` returns **NXDOMAIN**
(control: `supabase.com` resolves normally), so every session-end POST since the project
went away has been silently dropped.

### Second defect found while reading the script

`/tmp/lival-sessions/` holds **119 stale start files**, oldest 2026-07-30. Line 10
(`[ "$minutes" -lt 1 ] && exit 0`) returns before the `rm`, so every sub-minute session
leaks its start file forever. Harmless to data, but it makes the spool directory useless
as a signal and grows without bound.

### Third defect

`curl` has no `--max-time`/`--connect-timeout`. A black-holed network (as opposed to
today's fast NXDOMAIN) stalls session teardown on curl's default timeouts.

## Non-goals

- Restoring or recreating the Supabase project. The endpoint being dead is a separate
  decision for Liana; this work makes the data survive until it's answered.
- Retry-with-backoff inside the hook. Session end must not block. One attempt, then spool.
- Any change to the `ingest-time-entry` edge function.

## Design

### 1. Capture status, branch on it

`curl -o /dev/null -w '%{http_code}'` plus the curl exit code. Treat `2xx` as success.
Everything else — including exit code ≠ 0, which yields an empty/`000` status — is failure.

### 2. Spool failures durably, then delete the start file

On failure, write the exact JSON payload to a spool file and only then `rm` the start file.
If the spool write itself fails, leave the start file in place so nothing is lost.

**Spool location: `~/.claude/lival-spool/` — not `/tmp/lival-sessions/failed/`.**
Overriding the location from the bug report on purpose: macOS's `periodic daily` deletes
files under `/private/tmp` past an age threshold, and `/tmp` is cleared on reboot. A spool
whose whole job is surviving a multi-day outage cannot live there. `~/.claude/` is already
where the hooks and `LIVAL_INGEST_SECRET` live, so it adds no new location to reason about.

Start files stay in `/tmp` — they're intentionally ephemeral, scoped to a live session.

Spool filename: `<session-id>.json`. One file per session, so a re-run of the same session
overwrites rather than duplicating. Contents: the request body verbatim, nothing else. The
replay script owns the URL and headers.

### 3. Replay script

`scripts/hooks/lival-replay-spool.sh` — POST each spooled payload, delete on 2xx, leave on
failure, report a count. Safe to re-run: `ingest-time-entry` enforces idempotency via the
partial unique index on `(user_id, external_ref)` (migration `003`), and every spooled
payload carries `external_ref = <session-id>`.

### 4. Fix the start-file leak

`rm -f "$startfile"` before the sub-minute `exit 0`.

### 5. Timeouts

`--connect-timeout 5 --max-time 10`. A session-end hook may not hang.

### 6. Canonical scripts move into the repo

Today `docs/ingestion/README.md` inlines a full copy of both hook scripts. Two copies of
the same bash, no mechanism keeping them in sync — the README copy is already the thing
most likely to be read and trusted.

Canonical source becomes `scripts/hooks/` in this repo. `~/.claude/hooks/*.sh` is an
installed **copy**, not a symlink: the repo has already moved once (`~/Documents/LianaOS` →
`~/Developer/personal/lival-os` on 2026-08-02) and a symlink would have broken the hooks
silently. `scripts/hooks/install.sh` does the copy. The README points at the repo path and
stops inlining the bodies.

### 7. Endpoint override for testability

`LIVAL_INGEST_URL` env var, defaulting to the current hardcoded base URL. Lets the tests
point at a local stub server instead of the network, and lets the endpoint be repointed
without editing the script.

## Failure matrix

| Condition | Status | Start file | Spool | Exit |
|---|---|---|---|---|
| POST 201 | `201` | removed | — | 0 |
| POST 4xx/5xx | e.g. `401` | removed | written | 0 |
| DNS/connect fail | curl rc≠0, `000` | removed | written | 0 |
| Spool write fails | any failure | **kept** | — | 0 |
| Session < 1 min | — | removed | — | 0 |
| No start file | — | — | — | 0 |

Hook always exits 0. A non-zero exit from a `SessionEnd` hook surfaces noise at teardown
and cannot help — there is no one to retry.

## Testing

`scripts/hooks/test-session-end.sh` — plain bash, no framework (this is the only bash in
the repo; vitest and `deno test` cover TS/Deno and neither runs shell hooks). Stub server
is a `python3 -m http.server`-style one-liner whose status code the test controls, with
`LIVAL_INGEST_URL` pointed at it.

Cases: 201 clears the start file and writes no spool; 500 spools and clears the start file;
unreachable host spools; sub-minute session clears the start file and posts nothing;
replay deletes a spooled file on 2xx and keeps it on 500.

## Files

- Create `scripts/hooks/lival-session-start.sh` (moved, unchanged)
- Create `scripts/hooks/lival-session-end.sh` (hardened)
- Create `scripts/hooks/lival-replay-spool.sh`
- Create `scripts/hooks/install.sh`
- Create `scripts/hooks/test-session-end.sh`
- Modify `docs/ingestion/README.md` — replace inlined bodies with repo pointers, document
  the spool and replay
- Modify `CLAUDE.md` — note the canonical hook location and the spool
