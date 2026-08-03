#!/usr/bin/env bash
# LIVAL OS time tracking — compute elapsed minutes, post a time entry.
#
# On any failure (non-2xx, DNS, timeout, bad secret) the payload is spooled to
# $LIVAL_SPOOL_DIR and replayed later by lival-replay-spool.sh instead of being
# dropped. ingest-time-entry dedupes on external_ref, so replay cannot duplicate.
#
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
# returning early without the rm is what leaked 119 files into /tmp/lival-sessions.
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
    # Spool first; drop the start file only once the payload is safely on disk.
    if mkdir -p "$spool_dir" && printf '%s' "$payload" > "$spool_dir/$sid.json"; then
      echo "LIVAL: ingest failed (HTTP ${code:-000}); spooled to $spool_dir/$sid.json" >&2
      rm -f "$startfile"
    else
      echo "LIVAL: ingest failed (HTTP ${code:-000}) and spooling failed; keeping $startfile" >&2
    fi
    ;;
esac
exit 0
