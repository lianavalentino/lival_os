-- LIVAL OS — flag pre-heartbeat time entries as unreliable.
--
-- ADR-0003 / issue #7: every Claude Code entry recorded before this migration
-- was wall-clock (session end minus session start), not accumulated work.
-- 41 entries, 511 hours, some spanning days — see issue #10. The durations
-- are unrecoverable, so entries are flagged rather than deleted: the work
-- happened, only the duration is wrong. Reports exclude flagged entries by
-- default (app-side, not here); a deliberate view can still show them.
--
-- Only `claude_code` entries are touched. `manual` and `codex` sources never
-- went through the wall-clock hook and are unaffected by the bug this fixes.
--
-- Idempotent: the cutover is a fixed literal, not now() — Supabase applies a
-- migration exactly once in real deploys, but a manual re-run (disaster
-- recovery, this file's own fixture verification) must not treat the elapsed
-- time since the first run as more pre-fix history. A dynamic now() cutover
-- was tried and failed exactly that way: a legitimately post-fix claude_code
-- row inserted between two runs got swept up by the second run's later
-- now(). The literal below is when this migration was written; every row
-- that existed by then is pre-fix by construction.
--
-- VERIFIED against postgres:15-alpine with migrations 001–004 loaded and a
-- fixture covering all three source types plus a post-cutover claude_code
-- row. Every pre-existing claude_code row flagged, manual and codex
-- untouched, post-cutover claude_code row untouched, second run a no-op.

alter table public.time_entries
  add column if not exists unreliable boolean not null default false;

comment on column public.time_entries.unreliable is
  'True for entries recorded before ADR-0003 (heartbeat-based measurement). '
  'Duration is wall-clock, not accumulated work, and may be substantially '
  'inflated. Excluded from totals and reports by default.';

do $$
declare
  v_cutover constant timestamptz := timestamptz '2026-08-11T16:04:24Z';
begin
  update public.time_entries
     set unreliable = true
   where source = 'claude_code'
     and created_at < v_cutover
     and not unreliable;
end $$;
