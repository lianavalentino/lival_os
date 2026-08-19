#!/usr/bin/env bash
# LIVAL OS time tracking — heartbeat on every completed Codex turn.
#
# Registered as Codex's Stop hook (fires once per finished turn — Codex's
# turn-stop event, the closest analogue to Claude Code's completed-turn Stop
# hook). Codex has no session-end event (issue #9's whole premise), so unlike
# Claude Code there is no lival-codex-session-end.sh: the last heartbeat is
# the record. See lival-heartbeat-lib.sh for the accumulation and posting
# logic this shares byte-for-byte with lival-heartbeat.sh — the only
# difference between the two wrappers is the "source" tag passed to
# lival_beat_and_post, which is what lets Codex and Claude Code entries be
# told apart downstream.
#
# Canonical source: lival-os/scripts/hooks/. Install with ./install.sh.
here=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=./lival-heartbeat-lib.sh
source "$here/lival-heartbeat-lib.sh"

input=$(cat)
sid=$(printf '%s' "$input" | lival_read_sid)

session_dir="${LIVAL_SESSION_DIR:-/tmp/lival-sessions}"
spool_dir="${LIVAL_SPOOL_DIR:-$HOME/.codex/lival-spool}"
base_url="${LIVAL_INGEST_URL:-https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1}"

lival_beat_and_post "$sid" "$session_dir" "$spool_dir" "$base_url" "codex"
exit 0
