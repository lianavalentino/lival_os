# Session Time-Tracking Hook Durability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `lival-session-end.sh` from silently discarding tracked time when the ingest POST fails; spool failures durably and make them replayable.

**Architecture:** Canonical hook scripts move into `scripts/hooks/` in this repo and are installed to `~/.claude/hooks/` by copy. The end hook captures the HTTP status, and on any non-2xx or transport failure writes the request body to `~/.claude/lival-spool/<session-id>.json` before removing the start file. A replay script drains the spool, relying on `ingest-time-entry`'s `external_ref` idempotency so re-runs cannot duplicate.

**Tech Stack:** bash, curl, python3 (already used by the hooks for JSON parsing and available as `/usr/bin/python3` on macOS)

## Global Constraints

- Hook always exits 0. A failing `SessionEnd` hook produces teardown noise and cannot be retried.
- Never remove the start file unless the entry is either accepted (2xx) or safely spooled.
- Spool lives at `~/.claude/lival-spool/`, never under `/tmp` — `/tmp` is purged on reboot and by `periodic daily`.
- `LIVAL_INGEST_URL` defaults to `https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1`.
- Spool filename is `<session-id>.json`; body only, no headers or URL.
- curl always carries `--connect-timeout 5 --max-time 10`.
- `~/.claude/hooks/*.sh` is a copy of `scripts/hooks/*.sh`, never a symlink.
- No secrets in the repo. `LIVAL_INGEST_SECRET` is read from the environment only.

---

### Task 1: Test harness + hardened end hook

**Files:**
- Create: `scripts/hooks/lival-session-start.sh`
- Create: `scripts/hooks/lival-session-end.sh`
- Test: `scripts/hooks/test-session-end.sh`

**Interfaces:**
- Produces: `lival-session-end.sh` reading `LIVAL_INGEST_URL` (base URL, no trailing slash), `LIVAL_INGEST_SECRET`, and `LIVAL_SPOOL_DIR` (defaults `$HOME/.claude/lival-spool`); writes `$LIVAL_SPOOL_DIR/<sid>.json` on failure.
- `LIVAL_SPOOL_DIR` exists solely so the test can redirect the spool; production never sets it.

- [ ] **Step 1: Write the failing test**

`scripts/hooks/test-session-end.sh` — stub server whose status code comes from a file, so one server serves every case:

```bash
#!/usr/bin/env bash
# Tests for lival-session-end.sh. Run: bash scripts/hooks/test-session-end.sh
set -u
here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
trap 'kill "$server_pid" 2>/dev/null; rm -rf "$tmp"' EXIT

status_file="$tmp/status"; echo 201 > "$status_file"
port=8731
/usr/bin/python3 - "$port" "$status_file" "$tmp/requests.log" <<'PY' &
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
port, status_file, log = int(sys.argv[1]), sys.argv[2], sys.argv[3]
class H(BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        open(log, 'ab').write(body + b"\n")
        self.send_response(int(open(status_file).read().strip()))
        self.end_headers()
    def log_message(self, *a): pass
HTTPServer(('127.0.0.1', port), H).serve_forever()
PY
server_pid=$!
sleep 1

fails=0
check() { # check <name> <expected> <actual>
  if [ "$2" = "$3" ]; then echo "ok   - $1"; else echo "FAIL - $1: expected '$2' got '$3'"; fails=$((fails+1)); fi
}

run_hook() { # run_hook <sid> <minutes-ago> ; sets up start file, runs hook
  sid="$1"; ago="$2"
  mkdir -p "$tmp/sessions" "$tmp/spool"
  echo $(( $(date +%s) - ago * 60 )) > "$tmp/sessions/$sid"
  LIVAL_SESSION_DIR="$tmp/sessions" LIVAL_SPOOL_DIR="$tmp/spool" \
    LIVAL_INGEST_URL="http://127.0.0.1:$port" LIVAL_INGEST_SECRET=test \
    bash "$here/lival-session-end.sh" <<< "{\"session_id\":\"$sid\"}"
  echo $?
}

echo 201 > "$status_file"
rc=$(run_hook ok-201 30)
check "201 exits 0"            "0"  "$rc"
check "201 removes start file" "no" "$([ -f "$tmp/sessions/ok-201" ] && echo yes || echo no)"
check "201 writes no spool"    "no" "$([ -f "$tmp/spool/ok-201.json" ] && echo yes || echo no)"

echo 500 > "$status_file"
rc=$(run_hook fail-500 30)
check "500 exits 0"              "0"  "$rc"
check "500 removes start file"   "no" "$([ -f "$tmp/sessions/fail-500" ] && echo yes || echo no)"
check "500 spools payload"       "yes" "$([ -f "$tmp/spool/fail-500.json" ] && echo yes || echo no)"
check "spooled body has minutes" "30" "$(/usr/bin/python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["duration_minutes"])' "$tmp/spool/fail-500.json")"
check "spooled body has ref"     "fail-500" "$(/usr/bin/python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["external_ref"])' "$tmp/spool/fail-500.json")"

mkdir -p "$tmp/sessions" "$tmp/spool"
echo $(( $(date +%s) - 1800 )) > "$tmp/sessions/unreachable"
LIVAL_SESSION_DIR="$tmp/sessions" LIVAL_SPOOL_DIR="$tmp/spool" \
  LIVAL_INGEST_URL="http://127.0.0.1:9" LIVAL_INGEST_SECRET=test \
  bash "$here/lival-session-end.sh" <<< '{"session_id":"unreachable"}'
check "unreachable exits 0"        "0"   "$?"
check "unreachable spools payload" "yes" "$([ -f "$tmp/spool/unreachable.json" ] && echo yes || echo no)"

echo 201 > "$status_file"
rc=$(run_hook too-short 0)
check "sub-minute exits 0"            "0"  "$rc"
check "sub-minute removes start file" "no" "$([ -f "$tmp/sessions/too-short" ] && echo yes || echo no)"
check "sub-minute posts nothing"      "no" "$(grep -q too-short "$tmp/requests.log" && echo yes || echo no)"

[ "$fails" -eq 0 ] && echo "PASS" || { echo "$fails failing"; exit 1; }
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bash scripts/hooks/test-session-end.sh`
Expected: FAIL — `scripts/hooks/lival-session-end.sh` does not exist yet.

- [ ] **Step 3: Write the start hook (moved verbatim, plus `LIVAL_SESSION_DIR`)**

```bash
#!/usr/bin/env bash
# LIVAL OS time tracking — record session start epoch keyed by session id.
# Canonical source: lival-os/scripts/hooks/. Install with ./install.sh.
input=$(cat)
sid=$(printf '%s' "$input" | /usr/bin/python3 -c 'import sys,json;print(json.load(sys.stdin).get("session_id","unknown"))')
session_dir="${LIVAL_SESSION_DIR:-/tmp/lival-sessions}"
mkdir -p "$session_dir"
date +%s > "$session_dir/$sid"
```

- [ ] **Step 4: Write the hardened end hook**

```bash
#!/usr/bin/env bash
# LIVAL OS time tracking — compute elapsed minutes, post a time entry.
# On any failure the payload is spooled to $LIVAL_SPOOL_DIR and replayed later by
# lival-replay-spool.sh; ingest-time-entry dedupes on external_ref so replay is safe.
# Canonical source: lival-os/scripts/hooks/. Install with ./install.sh.
input=$(cat)
sid=$(printf '%s' "$input" | /usr/bin/python3 -c 'import sys,json;print(json.load(sys.stdin).get("session_id","unknown"))')

session_dir="${LIVAL_SESSION_DIR:-/tmp/lival-sessions}"
spool_dir="${LIVAL_SPOOL_DIR:-$HOME/.claude/lival-spool}"
base_url="${LIVAL_INGEST_URL:-https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1}"

startfile="$session_dir/$sid"
[ -f "$startfile" ] || exit 0
start_epoch=$(cat "$startfile")
end_epoch=$(date +%s)
minutes=$(( (end_epoch - start_epoch) / 60 ))

# Sub-minute session: nothing worth recording, but still clear the start file —
# leaving it is what leaked 119 files into /tmp/lival-sessions by 2026-08-02.
if [ "$minutes" -lt 1 ]; then
  rm -f "$startfile"
  exit 0
fi

started_iso=$(date -u -r "$start_epoch" +%Y-%m-%dT%H:%M:%SZ)
payload="{\"started_at\":\"$started_iso\",\"duration_minutes\":$minutes,\"source\":\"claude_code\",\"external_ref\":\"$sid\"}"

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
  --connect-timeout 5 --max-time 10 \
  "$base_url/ingest-time-entry" \
  -H "Authorization: Bearer $LIVAL_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d "$payload")

case "$code" in
  2??)
    rm -f "$startfile"
    ;;
  *)
    # Spool first, remove the start file only once the payload is safely on disk.
    if mkdir -p "$spool_dir" && printf '%s' "$payload" > "$spool_dir/$sid.json"; then
      echo "LIVAL: ingest failed (HTTP ${code:-000}); spooled to $spool_dir/$sid.json" >&2
      rm -f "$startfile"
    else
      echo "LIVAL: ingest failed (HTTP ${code:-000}) and spooling failed; keeping $startfile" >&2
    fi
    ;;
esac
exit 0
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bash scripts/hooks/test-session-end.sh`
Expected: `PASS`, all checks `ok`.

- [ ] **Step 6: Commit**

```bash
git add scripts/hooks/lival-session-start.sh scripts/hooks/lival-session-end.sh scripts/hooks/test-session-end.sh
git commit -m "fix: stop discarding session time when ingest POST fails"
```

---

### Task 2: Replay script and installer

**Files:**
- Create: `scripts/hooks/lival-replay-spool.sh`
- Create: `scripts/hooks/install.sh`
- Test: `scripts/hooks/test-session-end.sh` (extend)

**Interfaces:**
- Consumes: spool files written by Task 1 at `$LIVAL_SPOOL_DIR/<sid>.json`, and the same `LIVAL_INGEST_URL` / `LIVAL_INGEST_SECRET` env contract.
- Produces: `lival-replay-spool.sh`, exit 0 when the spool drains fully, exit 1 when anything remains.

- [ ] **Step 1: Write the failing replay tests**

Append to `scripts/hooks/test-session-end.sh` before the final `[ "$fails" -eq 0 ]` line:

```bash
replay() {
  LIVAL_SPOOL_DIR="$tmp/spool" LIVAL_INGEST_URL="http://127.0.0.1:$port" \
    LIVAL_INGEST_SECRET=test bash "$here/lival-replay-spool.sh" >/dev/null 2>&1
  echo $?
}

mkdir -p "$tmp/spool"
printf '%s' '{"started_at":"2026-08-02T10:00:00Z","duration_minutes":5,"source":"claude_code","external_ref":"replay-me"}' > "$tmp/spool/replay-me.json"

echo 500 > "$status_file"
rc=$(replay)
check "replay failure exits 1"    "1"   "$rc"
check "replay failure keeps file" "yes" "$([ -f "$tmp/spool/replay-me.json" ] && echo yes || echo no)"

echo 201 > "$status_file"
rc=$(replay)
check "replay success exits 0"      "0"  "$rc"
check "replay success clears spool" "no" "$([ -f "$tmp/spool/replay-me.json" ] && echo yes || echo no)"

check "empty spool exits 0" "0" "$(replay)"
```

- [ ] **Step 2: Run the test to verify the new checks fail**

Run: `bash scripts/hooks/test-session-end.sh`
Expected: the four replay checks FAIL; `lival-replay-spool.sh` does not exist.

- [ ] **Step 3: Write the replay script**

```bash
#!/usr/bin/env bash
# LIVAL OS — replay time entries spooled by lival-session-end.sh after a failed POST.
# Safe to re-run: ingest-time-entry dedupes on (user_id, external_ref) via the partial
# unique index from migration 003, so a replayed entry cannot duplicate.
# Canonical source: lival-os/scripts/hooks/.
set -u

spool_dir="${LIVAL_SPOOL_DIR:-$HOME/.claude/lival-spool}"
base_url="${LIVAL_INGEST_URL:-https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1}"

if [ -z "${LIVAL_INGEST_SECRET:-}" ]; then
  echo "LIVAL_INGEST_SECRET is not set; nothing was sent." >&2
  exit 1
fi

sent=0
failed=0
for f in "$spool_dir"/*.json; do
  [ -e "$f" ] || break   # glob did not match: spool is empty
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
    --connect-timeout 5 --max-time 30 \
    "$base_url/ingest-time-entry" \
    -H "Authorization: Bearer $LIVAL_INGEST_SECRET" \
    -H "Content-Type: application/json" \
    --data-binary "@$f")
  case "$code" in
    2??) rm -f "$f"; sent=$((sent + 1)); echo "sent    $(basename "$f") ($code)" ;;
    *)   failed=$((failed + 1)); echo "kept    $(basename "$f") (HTTP ${code:-000})" >&2 ;;
  esac
done

echo "replayed $sent, still spooled $failed"
[ "$failed" -eq 0 ]
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bash scripts/hooks/test-session-end.sh`
Expected: `PASS`.

- [ ] **Step 5: Write the installer**

```bash
#!/usr/bin/env bash
# Install the LIVAL OS session hooks into ~/.claude/hooks/.
# Copies, deliberately — not symlinks. This repo moved once already
# (~/Documents/LianaOS → ~/Developer/personal/lival-os on 2026-08-02) and a
# symlink would have broken the hooks silently. Re-run after editing a hook.
set -euo pipefail
src=$(cd "$(dirname "$0")" && pwd)
dest="$HOME/.claude/hooks"
mkdir -p "$dest" "$HOME/.claude/lival-spool"
for f in lival-session-start.sh lival-session-end.sh lival-replay-spool.sh; do
  cp "$src/$f" "$dest/$f"
  chmod +x "$dest/$f"
  echo "installed $dest/$f"
done
```

- [ ] **Step 6: Verify the installer against the live hook directory**

Run: `bash scripts/hooks/install.sh && diff scripts/hooks/lival-session-end.sh ~/.claude/hooks/lival-session-end.sh`
Expected: three `installed …` lines, `diff` silent.

- [ ] **Step 7: Commit**

```bash
git add scripts/hooks/lival-replay-spool.sh scripts/hooks/install.sh scripts/hooks/test-session-end.sh
git commit -m "feat: add spool replay script and hook installer"
```

---

### Task 3: Documentation

**Files:**
- Modify: `docs/ingestion/README.md` — "Producer: Claude Code time tracking (hook)" section
- Modify: `CLAUDE.md` — "Where this connects" inbound-live bullet

**Interfaces:**
- Consumes: the file names and env-var contract from Tasks 1 and 2.

- [ ] **Step 1: Replace the inlined hook bodies in `docs/ingestion/README.md`**

Delete both inlined script bodies. Point at `scripts/hooks/`, keep the `settings.json`
snippet, and document the failure path:

```markdown
## Producer: Claude Code time tracking (hook)

Canonical scripts live in [`scripts/hooks/`](../../scripts/hooks/) — that is the only
copy to edit. `~/.claude/hooks/*.sh` are installed copies:

    bash scripts/hooks/install.sh

`SessionStart` records the start epoch under `/tmp/lival-sessions/<session-id>`;
`SessionEnd` computes elapsed minutes and posts to `ingest-time-entry`. Add to
`~/.claude/settings.json`:

(keep the existing JSON block unchanged)

**When the POST fails** — endpoint down, no network, bad secret — the payload is written to
`~/.claude/lival-spool/<session-id>.json` instead of being dropped, and the hook still
exits 0. Drain the spool once the endpoint is healthy:

    LIVAL_INGEST_SECRET=… bash scripts/hooks/lival-replay-spool.sh

Replay is idempotent: every spooled payload carries `external_ref = <session-id>`, and
`ingest-time-entry` dedupes on it.

Env vars: `LIVAL_INGEST_SECRET` (required), `LIVAL_INGEST_URL` (base URL override),
`LIVAL_SPOOL_DIR`, `LIVAL_SESSION_DIR`. The last two exist for the tests
(`bash scripts/hooks/test-session-end.sh`); production leaves them unset.
```

- [ ] **Step 2: Update the inbound-live bullet in `CLAUDE.md`**

Add to the existing "Inbound, live" bullet:

```markdown
  Hook scripts are canonically in `scripts/hooks/` and installed to `~/.claude/hooks/`
  by `scripts/hooks/install.sh` — edit the repo copy, never the installed one. A failed
  POST spools to `~/.claude/lival-spool/` rather than dropping the entry; drain it with
  `scripts/hooks/lival-replay-spool.sh`.
```

- [ ] **Step 3: Verify the README has no stale script copy**

Run: `grep -n 'date +%s\|python3 -c' docs/ingestion/README.md`
Expected: no output — the inlined bodies are gone.

- [ ] **Step 4: Commit**

```bash
git add docs/ingestion/README.md CLAUDE.md
git commit -m "docs: point hook docs at scripts/hooks, document the spool"
```

---

## Out of scope — needs a decision from Liana

`mfcdzgkhmzppfctdzhwy.supabase.co` is **NXDOMAIN** as of 2026-08-02. This plan makes the
data survive; it does not bring the endpoint back. Until the project is restored or
recreated, every session will spool and `lival-replay-spool.sh` will keep failing. The
119 stale start files in `/tmp/lival-sessions/` predate the fix and hold only epochs, not
payloads — they can be replayed by hand or discarded, also Liana's call.
