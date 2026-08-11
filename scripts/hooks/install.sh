#!/usr/bin/env bash
# Install the LIVAL OS session hooks for both Claude Code and Codex.
#
# Copies, deliberately — not symlinks. This repo moved once already
# (~/Documents/LianaOS → ~/Developer/personal/lival-os on 2026-08-02) and a symlink
# would have broken the hooks silently. Re-run after editing a hook.
#
# Two tools, one implementation (issue #9): the same hook scripts are copied
# to both ~/.claude/hooks/ (read by Claude Code's settings.json, unaffected
# by this change) and ~/.codex/hooks/ (read by the Codex plugin registered
# below). Claude Code additionally gets lival-session-end.sh, since it has a
# session-end event and Codex does not — see lival-codex-heartbeat.sh's
# header for why that's fine.
set -euo pipefail
src=$(cd "$(dirname "$0")" && pwd)

claude_dest="$HOME/.claude/hooks"
mkdir -p "$claude_dest" "$HOME/.claude/lival-spool"
for f in lival-session-start.sh lival-session-end.sh lival-heartbeat.sh lival-heartbeat-lib.sh lival-replay-spool.sh; do
  cp "$src/$f" "$claude_dest/$f"
  chmod +x "$claude_dest/$f"
  echo "installed $claude_dest/$f"
done

codex_home="${CODEX_HOME:-$HOME/.codex}"
codex_dest="$codex_home/hooks"
mkdir -p "$codex_dest" "$codex_home/lival-spool"
for f in lival-session-start.sh lival-heartbeat-lib.sh lival-codex-heartbeat.sh lival-replay-spool.sh; do
  cp "$src/$f" "$codex_dest/$f"
  chmod +x "$codex_dest/$f"
  echo "installed $codex_dest/$f"
done

bash "$src/register-codex-plugin.sh"
