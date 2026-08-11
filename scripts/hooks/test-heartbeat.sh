#!/usr/bin/env bash
# Tests for lival-heartbeat.sh (Stop hook) and lival-heartbeat-lib.sh's accumulation.
# Run: bash scripts/hooks/test-heartbeat.sh
set -u
here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
trap 'kill "$server_pid" 2>/dev/null; rm -rf "$tmp"' EXIT

status_file="$tmp/status"; echo 201 > "$status_file"
port=8732
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

accumulated() { # accumulated <sid> — reads back the state file's third line
  sed -n '3p' "$tmp/sessions/$1"
}

beat() { # beat <sid>; runs the Stop-hook entrypoint, echoes its exit code
  LIVAL_SESSION_DIR="$tmp/sessions" LIVAL_SPOOL_DIR="$tmp/spool" \
    LIVAL_INGEST_URL="http://127.0.0.1:$port" LIVAL_INGEST_SECRET=test \
    bash "$here/lival-heartbeat.sh" <<< "{\"session_id\":\"$1\"}" 2>/dev/null
  echo $?
}

posted() { grep -q "\"$1\"" "$tmp/requests.log" 2>/dev/null && echo yes || echo no; }
exists() { [ -f "$1" ] && echo yes || echo no; }

# posted_minutes <sid> — duration_minutes of the last posted beat for sid.
# Minute-granularity (not the raw accumulated-seconds state) is what a
# real caller ever observes, and floor(seconds/60) absorbs the sub-second
# wall-clock drift between a test's seed_state and the beat it drives —
# accumulated seconds can only ever drift upward by a fraction of a second
# per call (real time is monotonic), nowhere near a minute.
posted_minutes() {
  /usr/bin/python3 -c '
import json, sys
sid = sys.argv[1]
vals = [json.loads(l)["duration_minutes"] for l in open(sys.argv[2]) if json.loads(l).get("external_ref") == sid]
print(vals[-1] if vals else "")
' "$1" "$tmp/requests.log"
}

# --- accumulation cases (ADR-0003) ---

seed_state three-beats 900 300 0
rc=$(beat three-beats); check "three-beats beat1 exits 0" "0" "$rc"
seed_state three-beats 900 300 "$(accumulated three-beats)"   # simulate 5 more minutes passing
rc=$(beat three-beats); check "three-beats beat2 exits 0" "0" "$rc"
seed_state three-beats 900 300 "$(accumulated three-beats)"
rc=$(beat three-beats)
check "three beats five minutes apart accumulate fifteen minutes" "15" "$(posted_minutes three-beats)"

seed_state two-hour-gap 7200 7200 0
beat two-hour-gap > /dev/null
check "a single two-hour gap accumulates fifteen minutes, not one hundred twenty" "15" "$(posted_minutes two-hour-gap)"

seed_state exact-cap 900 900 0
beat exact-cap > /dev/null
check "a gap of exactly the cap accumulates the cap" "15" "$(posted_minutes exact-cap)"

seed_state mixed-gaps 99999 300 0
beat mixed-gaps > /dev/null                                    # +300
seed_state mixed-gaps 99999 300 "$(accumulated mixed-gaps)"
beat mixed-gaps > /dev/null                                    # +300
seed_state mixed-gaps 99999 7200 "$(accumulated mixed-gaps)"
beat mixed-gaps > /dev/null                                    # +900 (capped)
seed_state mixed-gaps 99999 300 "$(accumulated mixed-gaps)"
beat mixed-gaps > /dev/null                                    # +300
check "several short gaps and one long gap accumulate correctly together" "30" "$(posted_minutes mixed-gaps)"

seed_state no-beats 5 5 0
check "a session with a start and no beats accumulates nothing" "0" "$(accumulated no-beats)"

seed_state overnight 28800 28800 0
beat overnight > /dev/null                                     # capped at 900
seed_state overnight 28800 300 "$(accumulated overnight)"       # resumed work, 5 min later
beat overnight > /dev/null
check "an overnight gap plus resumed work accumulates the cap plus the resumed work, not the night" "20" "$(posted_minutes overnight)"

# --- session-start writes a state file lival_beat_and_post can read ---

mkdir -p "$tmp/sessions"
LIVAL_SESSION_DIR="$tmp/sessions" bash "$here/lival-session-start.sh" <<< '{"session_id":"fresh"}' > /dev/null 2>&1
check "session-start writes a three-line state file" "3" "$(wc -l < "$tmp/sessions/fresh" | tr -d ' ')"
check "session-start's freshly-started session has accumulated nothing" "0" "$(accumulated fresh)"
sleep 1.1
beat fresh > /dev/null
check "a beat against a real session-start file accumulates the elapsed gap" "yes" "$([ "$(accumulated fresh)" -ge 1 ] && echo yes || echo no)"

# --- posting behaviour ---

seed_state sub-minute 30 30 0
beat sub-minute > /dev/null
check "sub-minute accumulation posts nothing" "no" "$(posted sub-minute)"

seed_state real-beat 300 300 0
beat real-beat > /dev/null
check "a beat crossing a minute posts the running total" "yes" "$(posted real-beat)"
check "posted payload carries the accumulated minutes" "5" "$(posted_minutes real-beat)"

echo 500 > "$status_file"
seed_state failing-beat 300 300 0
beat failing-beat > /dev/null
check "a failed beat spools its payload" "yes" "$(exists "$tmp/spool/failing-beat.json")"
echo 201 > "$status_file"

rc=$(beat never-started)
check "a beat for a session with no state file exits 0" "0" "$rc"
check "a beat for a session with no state file posts nothing" "no" "$(posted never-started)"

[ "$fails" -eq 0 ] && echo "PASS" || { echo "$fails failing"; exit 1; }
