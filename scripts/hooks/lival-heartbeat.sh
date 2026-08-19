#!/usr/bin/env bash
# LIVAL OS time tracking — heartbeat on every completed assistant turn.
#
# Registered as the Stop hook (fires once per finished turn, not per tool
# call). See lival-heartbeat-lib.sh for the accumulation and posting logic
# this shares with lival-session-end.sh's final beat.
#
# Canonical source: lival-os/scripts/hooks/. Install with ./install.sh.
here=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=./lival-heartbeat-lib.sh
source "$here/lival-heartbeat-lib.sh"

input=$(cat)
sid=$(printf '%s' "$input" | lival_read_sid)

session_dir="${LIVAL_SESSION_DIR:-/tmp/lival-sessions}"
spool_dir="${LIVAL_SPOOL_DIR:-$HOME/.claude/lival-spool}"
base_url="${LIVAL_INGEST_URL:-https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1}"

lival_beat_and_post "$sid" "$session_dir" "$spool_dir" "$base_url" "claude_code"
exit 0
