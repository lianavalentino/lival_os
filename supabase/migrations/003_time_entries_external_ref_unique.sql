-- LIVAL OS — Phase 3 ingestion hardening.
-- DB-level backstop for the ingest-time-entry edge function's idempotency:
-- guarantees at most one time_entries row per (user_id, external_ref) when
-- external_ref is set. Rows with NULL external_ref are unaffected.
-- Additive only; no table or column changes.

create unique index if not exists time_entries_user_external_ref_uniq
  on public.time_entries (user_id, external_ref)
  where external_ref is not null;
