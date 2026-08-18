#!/usr/bin/env bash
# Tests for lival-codex-heartbeat.sh (Codex Stop/turn-completion hook).
#
# This rides the same lival_beat_and_post accumulation logic exercised in
# test-heartbeat.sh — see that file for the cap/accumulation cases. This file
# only covers what's actually new for #9: the source field distinguishing
# Codex from Claude Code, Codex sessions not merging with concurrent Claude
# Code sessions, and Codex posts spooling/replaying like Claude Code's.
#
# Run: bash scripts/hooks/test-codex-heartbeat.sh
set -u
here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
trap 'kill "$server_pid" 2>/dev/null; rm -rf "$tmp"' EXIT

status_file="$tmp/status"; echo 201 > "$status_file"
port=8733
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

for _ in $(seq 1 50); do
  curl -s -o /dev/null --connect-timeout 1 "http://127.0.0.1:$port" && break
  sleep 0.1
done

fails=0
check() { # check <name> <expected> <actual>
  if [ "$2" = "$3" ]; then echo "ok   - $1"; else echo "FAIL - $1: expected '$2' got '$3'"; fails=$((fails+1)); fi
}

# seed_state <sid> <start_ago_s> <last_beat_ago_s> <accumulated_s>
seed_state() {
  mkdir -p "$tmp/sessions"
  local now; now=$(date +%s)
  printf '%s\n%s\n%s\n' "$(( now - $2 ))" "$(( now - $3 ))" "$4" > "$tmp/sessions/$1"
}

# codex_beat <sid>; runs the Codex Stop-hook entrypoint, echoes its exit code
codex_beat() {
  LIVAL_SESSION_DIR="$tmp/sessions" LIVAL_SPOOL_DIR="$tmp/codex-spool" \
    LIVAL_INGEST_URL="http://127.0.0.1:$port" LIVAL_INGEST_SECRET=test \
    bash "$here/lival-codex-heartbeat.sh" <<< "{\"session_id\":\"$1\"}" 2>/dev/null
  echo $?
}

# claude_beat <sid>; runs the Claude Code Stop-hook entrypoint
claude_beat() {
  LIVAL_SESSION_DIR="$tmp/sessions" LIVAL_SPOOL_DIR="$tmp/claude-spool" \
    LIVAL_INGEST_URL="http://127.0.0.1:$port" LIVAL_INGEST_SECRET=test \
    bash "$here/lival-heartbeat.sh" <<< "{\"session_id\":\"$1\"}" 2>/dev/null
  echo $?
}

exists() { [ -f "$1" ] && echo yes || echo no; }

# posted_field <field> <sid> — last posted value of <field> for entries
# whose external_ref is <sid>.
posted_field() {
  /usr/bin/python3 -c '
import json, sys
field, sid = sys.argv[1], sys.argv[2]
vals = [json.loads(l)[field] for l in open(sys.argv[3]) if json.loads(l).get("external_ref") == sid]
print(vals[-1] if vals else "")
' "$1" "$2" "$tmp/requests.log"
}

# --- source field distinguishes Codex from Claude Code ---

seed_state codex-session 300 300 0
codex_beat codex-session > /dev/null
check "a Codex session posts source=codex" "codex" "$(posted_field source codex-session)"
check "a Codex session's payload carries its own session id as external_ref" "codex-session" "$(posted_field external_ref codex-session)"
check "a Codex beat crossing a minute posts the running total" "5" "$(posted_field duration_minutes codex-session)"

# --- concurrent Codex + Claude Code sessions attribute separately ---

seed_state concurrent-codex 300 300 0
seed_state concurrent-claude 300 300 0
codex_beat concurrent-codex > /dev/null
claude_beat concurrent-claude > /dev/null
check "concurrent Codex session tagged codex"       "codex"       "$(posted_field source concurrent-codex)"
check "concurrent Claude Code session tagged claude_code" "claude_code" "$(posted_field source concurrent-claude)"
check "the two concurrent sessions post distinct external_refs, not merged" \
  "concurrent-codex concurrent-claude" \
  "$(posted_field external_ref concurrent-codex) $(posted_field external_ref concurrent-claude)"

# --- failed Codex post spools and replays ---

echo 500 > "$status_file"
seed_state codex-failing 300 300 0
codex_beat codex-failing > /dev/null
check "a failed Codex beat spools its payload" "yes" "$(exists "$tmp/codex-spool/codex-failing.json")"
check "the spooled Codex payload is tagged codex" "codex" \
  "$(/usr/bin/python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["source"])' "$tmp/codex-spool/codex-failing.json")"

echo 201 > "$status_file"
rc=$(LIVAL_SPOOL_DIR="$tmp/codex-spool" LIVAL_INGEST_URL="http://127.0.0.1:$port" \
  LIVAL_INGEST_SECRET=test bash "$here/lival-replay-spool.sh" >/dev/null 2>&1; echo $?)
check "replaying the Codex spool exits 0"          "0"  "$rc"
check "replaying the Codex spool clears the file"  "no" "$(exists "$tmp/codex-spool/codex-failing.json")"
check "the replayed Codex entry lands with source=codex" "codex" "$(posted_field source codex-failing)"

[ "$fails" -eq 0 ] && echo "PASS" || { echo "$fails failing"; exit 1; }
