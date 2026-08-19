#!/usr/bin/env bash
# LIVAL OS time tracking — register the Codex-side heartbeat hooks.
#
# Adds a local marketplace (scripts/hooks/codex-plugin/) to Codex's
# configured marketplace sources and installs/enables the plugin it
# publishes, which wires Codex's SessionStart and Stop events to the
# heartbeat scripts installed by install.sh (see lival-codex-heartbeat.sh
# and lival-session-start.sh).
#
# Additive and idempotent by construction, not by anything this script does:
# `codex plugin marketplace add` on an already-registered source and
# `codex plugin add` on an already-installed plugin are both no-ops against
# existing config.toml content — verified in test-codex-install.sh against a
# scratch CODEX_HOME. This script does not hand-edit config.toml; the codex
# CLI is the only thing that touches it, which is what keeps a second run
# from ever producing a second registration.
#
# Respects CODEX_HOME like the codex CLI itself does, so this is safe to
# point at a scratch config for testing (see test-codex-install.sh) as well
# as the real one.
#
# Canonical source: lival-os/scripts/hooks/. Install with ./install.sh.
set -u
here=$(cd "$(dirname "$0")" && pwd)
marketplace_dir="$here/codex-plugin"
plugin_id="lival-codex-heartbeat@lival-time-tracking"

if ! command -v codex >/dev/null 2>&1; then
  echo "register-codex-plugin: codex CLI not found on PATH; skipping Codex hook registration" >&2
  exit 0
fi

if ! codex plugin marketplace add "$marketplace_dir" --json > /dev/null 2>&1; then
  echo "register-codex-plugin: failed to register marketplace at $marketplace_dir" >&2
  exit 1
fi
echo "registered marketplace lival-time-tracking -> $marketplace_dir"

if ! codex plugin add "$plugin_id" --json > /dev/null 2>&1; then
  echo "register-codex-plugin: failed to install plugin $plugin_id" >&2
  exit 1
fi
echo "installed/enabled plugin $plugin_id"
