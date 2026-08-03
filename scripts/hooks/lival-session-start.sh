#!/usr/bin/env bash
# LIVAL OS time tracking — record session start epoch keyed by session id.
# Canonical source: lival-os/scripts/hooks/. Install with ./install.sh.
input=$(cat)
sid=$(printf '%s' "$input" | /usr/bin/python3 -c 'import sys,json;print(json.load(sys.stdin).get("session_id","unknown"))')
session_dir="${LIVAL_SESSION_DIR:-/tmp/lival-sessions}"
mkdir -p "$session_dir"
date +%s > "$session_dir/$sid"
