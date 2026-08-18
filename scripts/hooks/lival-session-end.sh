#!/usr/bin/env bash
# LIVAL OS time tracking — final heartbeat, then clear local session state.
#
# Session end is no longer the moment of truth (ADR-0003): lival-heartbeat.sh
# already posts the running total on every completed turn, so this hook's job
# shrinks to writing the last beat — the capped gap since the previous one —
# and cleaning up the state file. A session that never fires this cleanly
# (crash, closed laptop, killed terminal) still has an accurate record up to
# its last beat; this just tidies up the common case.
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
# The state file's job ends here whether the post succeeded, failed, or was
# never sent (sub-minute) — a failure already lives on safely in the spool,
# keyed by session id, independent of this file.
rm -f "$session_dir/$sid"
exit 0
