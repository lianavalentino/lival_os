-- LIVAL OS — Phase 3 ingestion hardening.
-- DB-level backstop for the ingest-quick-capture edge function's idempotency:
-- guarantees at most one inbox_items row per (user_id, external_ref) when
-- external_ref is set. Rows with NULL external_ref are unaffected.
-- Adds the external_ref column if not present, then adds the unique index.

alter table public.inbox_items add column if not exists external_ref text;

create unique index if not exists inbox_items_user_external_ref_uniq
  on public.inbox_items (user_id, external_ref)
  where external_ref is not null;
