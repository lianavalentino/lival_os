#!/usr/bin/env bash
# LIVAL OS time tracking — shared heartbeat accumulation + post logic.
#
# Sourced by lival-heartbeat.sh (Stop hook, fires on every completed assistant
# turn) and lival-session-end.sh (final beat, then local state cleanup).
# ADR-0003: duration is the accumulation of capped gaps between beats, not the
# distance between session start and session end.
#
# Canonical source: lival-os/scripts/hooks/. Install with ./install.sh.

LIVAL_HEARTBEAT_CAP_SECONDS="${LIVAL_HEARTBEAT_CAP_SECONDS:-900}" # 15 minutes

lival_read_sid() {
  /usr/bin/python3 -c 'import sys,json;print(json.load(sys.stdin).get("session_id","unknown"))'
}

lival_iso() { # lival_iso <epoch>
  date -u -r "$1" +%Y-%m-%dT%H:%M:%SZ
}

# lival_beat_and_post <sid> <session_dir> <spool_dir> <base_url>
#
# Advances the session's accumulated time by the gap since its last beat,
# capped at LIVAL_HEARTBEAT_CAP_SECONDS, then posts the running total keyed by
# session id. A session with no state file (never started, or already ended)
# is a silent no-op. Sub-minute totals are not posted — nothing worth
# recording yet, and a session that never crosses a minute should never
# create a row.
#
# Duration only ever moves upward for a given session: this function never
# computes a smaller total than what is already on disk, and the endpoint
# separately refuses to lower a stored duration — so a spooled beat replayed
# after a later beat has already landed cannot regress it.
lival_beat_and_post() {
  local sid="$1" session_dir="$2" spool_dir="$3" base_url="$4"
  local statefile="$session_dir/$sid"
  [ -f "$statefile" ] || return 0

  local start_epoch last_beat accumulated
  { read -r start_epoch; read -r last_beat; read -r accumulated; } < "$statefile"

  local now gap
  now=$(date +%s)
  gap=$(( now - last_beat ))
  [ "$gap" -lt 0 ] && gap=0
  [ "$gap" -gt "$LIVAL_HEARTBEAT_CAP_SECONDS" ] && gap="$LIVAL_HEARTBEAT_CAP_SECONDS"
  accumulated=$(( accumulated + gap ))

  printf '%s\n%s\n%s\n' "$start_epoch" "$now" "$accumulated" > "$statefile"

  local minutes=$(( accumulated / 60 ))
  [ "$minutes" -lt 1 ] && return 0

  local started_iso payload code
  started_iso=$(lival_iso "$start_epoch")
  payload="{\"started_at\":\"$started_iso\",\"duration_minutes\":$minutes,\"source\":\"claude_code\",\"external_ref\":\"$sid\"}"

  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
    --connect-timeout 5 --max-time 10 \
    "$base_url/ingest-time-entry" \
    -H "Authorization: Bearer $LIVAL_INGEST_SECRET" \
    -H "Content-Type: application/json" \
    -d "$payload")

  case "$code" in
    2??)
      # A prior failed beat may have spooled a lower total; it is now stale
      # and, left behind, would eventually replay a harmless but pointless
      # no-op update. Clear it.
      rm -f "$spool_dir/$sid.json"
      ;;
    *)
      if mkdir -p "$spool_dir" && printf '%s' "$payload" > "$spool_dir/$sid.json"; then
        echo "LIVAL: ingest failed (HTTP ${code:-000}); spooled to $spool_dir/$sid.json" >&2
      else
        echo "LIVAL: ingest failed (HTTP ${code:-000}) and spooling failed" >&2
      fi
      ;;
  esac
}
