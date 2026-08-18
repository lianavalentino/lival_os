#!/usr/bin/env bash
# Tests for register-codex-plugin.sh — the Codex-side half of the installer.
#
# This is deliberately a behavioral test against the real `codex` CLI, not a
# mock: issue #9's Testing Decisions call the Codex registration itself
# "configuration... verified by installing it and observing behaviour." It
# runs against a scratch CODEX_HOME (never the real ~/.codex) so it's safe to
# run repeatedly and in CI without mutating the machine's actual Codex
# config. The real ~/.codex/config.toml only gets touched by the one-time,
# manual live-verification install described in the PR.
#
# Skips (exit 0, prints why) if the `codex` CLI isn't on PATH — the shared
# heartbeat logic this depends on is already covered by test-heartbeat.sh and
# test-codex-heartbeat.sh without it.
#
# Run: bash scripts/hooks/test-codex-install.sh
set -u
here=$(cd "$(dirname "$0")" && pwd)

if ! command -v codex >/dev/null 2>&1; then
  echo "SKIP - codex CLI not on PATH; nothing to verify"
  exit 0
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

fails=0
check() { # check <name> <expected> <actual>
  if [ "$2" = "$3" ]; then echo "ok   - $1"; else echo "FAIL - $1: expected '$2' got '$3'"; fails=$((fails+1)); fi
}

codexhome="$tmp/codexhome"
mkdir -p "$codexhome"

# A real (if trivial) marketplace, standing in for the vercel-plugin /
# claude-mem marketplaces already live in Liana's real ~/.codex/config.toml —
# `codex plugin list` loads every configured marketplace snapshot, so this
# has to actually resolve, not just be a path string, for the later
# `plugin list` assertion to be meaningful.
other_marketplace_dir="$tmp/some-other-marketplace"
mkdir -p "$other_marketplace_dir/.claude-plugin" "$other_marketplace_dir/plugin/.codex-plugin"
cat > "$other_marketplace_dir/.claude-plugin/marketplace.json" <<'EOF'
{"name": "some-other-marketplace", "owner": {"name": "test"}, "plugins": [
  {"name": "some-other-plugin", "version": "1.0.0", "source": "./plugin", "description": "stand-in for a pre-existing plugin"}
]}
EOF
cat > "$other_marketplace_dir/plugin/.codex-plugin/plugin.json" <<'EOF'
{"name": "some-other-plugin", "version": "1.0.0", "description": "stand-in for a pre-existing plugin"}
EOF

# Seed a pre-existing, unrelated marketplace + plugin registration — so we
# can prove the installer is additive rather than assuming it from reading
# the code.
cat > "$codexhome/config.toml" <<EOF
[marketplaces.some-other-marketplace]
last_updated = "2026-01-01T00:00:00Z"
source_type = "local"
source = "$other_marketplace_dir"

[plugins."some-other-plugin@some-other-marketplace"]
enabled = true
EOF

count_occurrences() { # count_occurrences <needle> <file>
  grep -c -F "$1" "$2" 2>/dev/null || true
}

CODEX_HOME="$codexhome" bash "$here/register-codex-plugin.sh" >/dev/null 2>&1
rc1=$?
check "first install run exits 0" "0" "$rc1"
check "first run preserves the pre-existing marketplace registration" "1" \
  "$(count_occurrences '[marketplaces.some-other-marketplace]' "$codexhome/config.toml")"
check "first run preserves the pre-existing plugin registration" "1" \
  "$(count_occurrences 'some-other-plugin@some-other-marketplace' "$codexhome/config.toml")"
check "first run registers our marketplace" "1" \
  "$(count_occurrences '[marketplaces.lival-time-tracking]' "$codexhome/config.toml")"
check "first run registers and enables our plugin" "1" \
  "$(count_occurrences 'lival-codex-heartbeat@lival-time-tracking' "$codexhome/config.toml")"

CODEX_HOME="$codexhome" bash "$here/register-codex-plugin.sh" >/dev/null 2>&1
rc2=$?
check "second install run exits 0" "0" "$rc2"
check "running the installer twice still preserves the pre-existing marketplace" "1" \
  "$(count_occurrences '[marketplaces.some-other-marketplace]' "$codexhome/config.toml")"
check "running the installer twice still preserves the pre-existing plugin" "1" \
  "$(count_occurrences 'some-other-plugin@some-other-marketplace' "$codexhome/config.toml")"
check "running the installer twice leaves one marketplace registration, not two" "1" \
  "$(count_occurrences '[marketplaces.lival-time-tracking]' "$codexhome/config.toml")"
check "running the installer twice leaves one plugin registration, not two" "1" \
  "$(count_occurrences 'lival-codex-heartbeat@lival-time-tracking' "$codexhome/config.toml")"

check "our plugin ends up enabled" "1" \
  "$(CODEX_HOME="$codexhome" codex plugin list --json 2>/dev/null | /usr/bin/python3 -c 'import json,sys; d=json.load(sys.stdin); print(sum(1 for p in d["installed"] if p["pluginId"]=="lival-codex-heartbeat@lival-time-tracking" and p["enabled"]))')"

[ "$fails" -eq 0 ] && echo "PASS" || { echo "$fails failing"; exit 1; }
