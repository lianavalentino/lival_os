#!/usr/bin/env bash
# LIVAL OS — replay time entries spooled by lival-session-end.sh after a failed POST.
#
# Safe to re-run: ingest-time-entry dedupes on (user_id, external_ref) via the partial
# unique index from migration 003, so a replayed entry cannot duplicate.
#
# Canonical source: lival-os/scripts/hooks/.
set -u

spool_dir="${LIVAL_SPOOL_DIR:-$HOME/.claude/lival-spool}"
base_url="${LIVAL_INGEST_URL:-https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1}"

if [ -z "${LIVAL_INGEST_SECRET:-}" ]; then
  echo "LIVAL_INGEST_SECRET is not set; nothing was sent." >&2
  exit 1
fi

sent=0
failed=0
for f in "$spool_dir"/*.json; do
  [ -e "$f" ] || break   # glob did not match: spool is empty
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
    --connect-timeout 5 --max-time 30 \
    "$base_url/ingest-time-entry" \
    -H "Authorization: Bearer $LIVAL_INGEST_SECRET" \
    -H "Content-Type: application/json" \
    --data-binary "@$f")
  case "$code" in
    2??) rm -f "$f"; sent=$((sent + 1)); echo "sent    $(basename "$f") ($code)" ;;
    *)   failed=$((failed + 1)); echo "kept    $(basename "$f") (HTTP ${code:-000})" >&2 ;;
  esac
done

echo "replayed $sent, still spooled $failed"
[ "$failed" -eq 0 ]
