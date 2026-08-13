#!/usr/bin/env bash
# LIVAL OS time tracking — initialise heartbeat state, keyed by session id.
#
# State file is three lines: start epoch, last-beat epoch, accumulated
# seconds. lival-heartbeat.sh (Stop hook) and lival-session-end.sh advance it
# on every beat. See lival-heartbeat-lib.sh and ADR-0003.
#
# Canonical source: lival-os/scripts/hooks/. Install with ./install.sh.
input=$(cat)
sid=$(printf '%s' "$input" | /usr/bin/python3 -c 'import sys,json;print(json.load(sys.stdin).get("session_id","unknown"))')
session_dir="${LIVAL_SESSION_DIR:-/tmp/lival-sessions}"
mkdir -p "$session_dir"
now=$(date +%s)
printf '%s\n%s\n%s\n' "$now" "$now" 0 > "$session_dir/$sid"
