#!/usr/bin/env bash
# Tests for lival-session-end.sh and lival-replay-spool.sh.
# Run: bash scripts/hooks/test-session-end.sh
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

# Poll for readiness rather than sleeping a fixed interval — a cold start slower than
# the sleep made the first case spool instead of succeeding, which looked like a hook bug.
for _ in $(seq 1 50); do
  curl -s -o /dev/null --connect-timeout 1 "http://127.0.0.1:$port" && break
  sleep 0.1
done

fails=0
check() { # check <name> <expected> <actual>
  if [ "$2" = "$3" ]; then echo "ok   - $1"; else echo "FAIL - $1: expected '$2' got '$3'"; fails=$((fails+1)); fi
}

# run_hook <sid> <minutes-ago>; seeds a state file whose last beat was
# <minutes-ago> minutes ago with nothing yet accumulated — a session that
# reached session-end without a single Stop-hook beat in between, so the
# final beat is the only interval there is. Runs the hook, echoes exit code.
run_hook() {
  sid="$1"; ago="$2"
  mkdir -p "$tmp/sessions" "$tmp/spool"
  local start; start=$(( $(date +%s) - ago * 60 ))
  printf '%s\n%s\n%s\n' "$start" "$start" 0 > "$tmp/sessions/$sid"
  LIVAL_SESSION_DIR="$tmp/sessions" LIVAL_SPOOL_DIR="$tmp/spool" \
    LIVAL_INGEST_URL="http://127.0.0.1:$port" LIVAL_INGEST_SECRET=test \
    bash "$here/lival-session-end.sh" <<< "{\"session_id\":\"$sid\"}" 2>/dev/null
  echo $?
}

exists() { [ -f "$1" ] && echo yes || echo no; }

echo 201 > "$status_file"
rc=$(run_hook ok-201 30)
check "201 exits 0"            "0"  "$rc"
check "201 removes start file" "no" "$(exists "$tmp/sessions/ok-201")"
check "201 writes no spool"    "no" "$(exists "$tmp/spool/ok-201.json")"

echo 500 > "$status_file"
rc=$(run_hook fail-500 30)
check "500 exits 0"              "0"   "$rc"
check "500 removes start file"   "no"  "$(exists "$tmp/sessions/fail-500")"
check "500 spools payload"       "yes" "$(exists "$tmp/spool/fail-500.json")"
check "spooled body has minutes, capped at fifteen" "15" "$(/usr/bin/python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["duration_minutes"])' "$tmp/spool/fail-500.json")"
check "spooled body has ref"     "fail-500" "$(/usr/bin/python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["external_ref"])' "$tmp/spool/fail-500.json")"

echo 401 > "$status_file"
rc=$(run_hook fail-401 12)
check "401 exits 0"        "0"   "$rc"
check "401 spools payload" "yes" "$(exists "$tmp/spool/fail-401.json")"

mkdir -p "$tmp/sessions" "$tmp/spool"
unreach_start=$(( $(date +%s) - 1800 ))
printf '%s\n%s\n%s\n' "$unreach_start" "$unreach_start" 0 > "$tmp/sessions/unreachable"
LIVAL_SESSION_DIR="$tmp/sessions" LIVAL_SPOOL_DIR="$tmp/spool" \
  LIVAL_INGEST_URL="http://127.0.0.1:9" LIVAL_INGEST_SECRET=test \
  bash "$here/lival-session-end.sh" <<< '{"session_id":"unreachable"}' 2>/dev/null
check "unreachable exits 0"            "0"   "$?"
check "unreachable spools payload"     "yes" "$(exists "$tmp/spool/unreachable.json")"
check "unreachable removes start file" "no"  "$(exists "$tmp/sessions/unreachable")"

echo 201 > "$status_file"
rc=$(run_hook too-short 0)
check "sub-minute exits 0"            "0"  "$rc"
check "sub-minute removes start file" "no" "$(exists "$tmp/sessions/too-short")"
check "sub-minute posts nothing"      "no" "$(grep -q too-short "$tmp/requests.log" && echo yes || echo no)"

rc=$(LIVAL_SESSION_DIR="$tmp/sessions" LIVAL_SPOOL_DIR="$tmp/spool" \
  LIVAL_INGEST_URL="http://127.0.0.1:$port" LIVAL_INGEST_SECRET=test \
  bash "$here/lival-session-end.sh" <<< '{"session_id":"never-started"}' 2>/dev/null; echo $?)
check "missing start file exits 0" "0" "$rc"

# --- replay ---

replay() {
  LIVAL_SPOOL_DIR="$tmp/spool" LIVAL_INGEST_URL="http://127.0.0.1:$port" \
    LIVAL_INGEST_SECRET=test bash "$here/lival-replay-spool.sh" >/dev/null 2>&1
  echo $?
}

rm -f "$tmp/spool"/*.json
printf '%s' '{"started_at":"2026-08-02T10:00:00Z","duration_minutes":5,"source":"claude_code","external_ref":"replay-me"}' > "$tmp/spool/replay-me.json"

echo 500 > "$status_file"
rc=$(replay)
check "replay failure exits 1"    "1"   "$rc"
check "replay failure keeps file" "yes" "$(exists "$tmp/spool/replay-me.json")"

echo 201 > "$status_file"
rc=$(replay)
check "replay success exits 0"      "0"  "$rc"
check "replay success clears spool" "no" "$(exists "$tmp/spool/replay-me.json")"

check "empty spool exits 0" "0" "$(replay)"

# env -u, not just an unset assignment: the real secret is exported into any Claude Code
# session (it lives in ~/.claude/settings.json env) and would otherwise leak into the test.
rc=$(env -u LIVAL_INGEST_SECRET LIVAL_SPOOL_DIR="$tmp/spool" LIVAL_INGEST_URL="http://127.0.0.1:$port" \
  bash "$here/lival-replay-spool.sh" >/dev/null 2>&1; echo $?)
check "replay without secret exits 1" "1" "$rc"

[ "$fails" -eq 0 ] && echo "PASS" || { echo "$fails failing"; exit 1; }
