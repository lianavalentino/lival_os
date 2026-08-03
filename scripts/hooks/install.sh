#!/usr/bin/env bash
# Install the LIVAL OS session hooks into ~/.claude/hooks/.
#
# Copies, deliberately — not symlinks. This repo moved once already
# (~/Documents/LianaOS → ~/Developer/personal/lival-os on 2026-08-02) and a symlink
# would have broken the hooks silently. Re-run after editing a hook.
set -euo pipefail
src=$(cd "$(dirname "$0")" && pwd)
dest="$HOME/.claude/hooks"
mkdir -p "$dest" "$HOME/.claude/lival-spool"
for f in lival-session-start.sh lival-session-end.sh lival-replay-spool.sh; do
  cp "$src/$f" "$dest/$f"
  chmod +x "$dest/$f"
  echo "installed $dest/$f"
done
