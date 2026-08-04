# External memory is a Producer and a Projection, never an authority

An Obsidian vault (the Vault, see CONTEXT.md) is being built as Liana's narrative memory:
daily notes, call distillates, project pages, maintained live by Claude sessions and swept
nightly by a reconciler agent. This ADR bounds how that system and LIVAL OS relate.

The Vault writes into LIVAL OS only as a Producer, through bearer-gated ingestion
endpoints. It reads LIVAL OS state only through Projections — read-only, one-way exports
rendered for display. No channel does both, the vault agent never holds the service-role
key, and nothing in the Vault is ever authoritative.

Decided 2026-08-04, during the design grill for the Vault build.

## Why the Vault is not part of the product

The Vault's scope is wider than LIVAL OS: client call transcripts, session logs across
every repo, business PII. Folding it into the product would either drag that content into
the lival-os repo (a privacy leak already flagged the day this was decided) or shrink the
Vault to fit. It lives in its own private repo and relates to LIVAL OS the way any external
system does — through the same two channel types everything else uses.

## Why no tasks in the Vault

The dual-tracker problem was already litigated once, as GitHub Issues versus LIVAL OS
Tasks. A markdown folder of things-to-do is the same disease: two lists that drift, two
places to triage, no single answer to "what am I supposed to do next." So the boundary is
absolute rather than pragmatic:

- The Vault holds zero pre-triage content. An `inbox/` folder was in the original design
  and was deleted. Important emails become captures through an Email Capture Path (Gmail
  scan → quick-capture, `external_ref` = message ID) and land in the one Inbox.
- Unresolved commitments the agent notices in narrative are *captured*, not listed. They
  flow through triage like everything else; LIVAL OS stays the sole authority on Open
  Loops. The Vault may mention loose threads in prose — prose is not data.
- Task state shown in the Vault (a daily note's dashboard section) is a Projection. If
  Liana scribbles "done" next to a projected task in Obsidian, nothing happens — completion
  only counts in LIVAL OS.

## Why endpoint-only writes

The nightly agent could trivially hold the service-role key and write tables directly. It
doesn't, for the same reason phones don't: Producers go through ingestion endpoints. A
bearer token's blast radius if leaked is fake summaries in one table; the service-role
key's is the whole database. It also keeps the idempotency discipline uniform — the daily
summary write uses the same `external_ref` upsert pattern as quick-capture
(`vault:daily/2026-08-04#project`), so replaying a night's run is safe by construction.

## Consequences

- One new edge function (`ingest-daily-summary`) and one new table (`daily_summaries`,
  no open-loops column) instead of a direct DB grant.
- The weekly review (ADR 0001, runs in Postgres) gains narrative input by reading
  `daily_summaries` rows. It never reads vault files — Postgres has no reason to know the
  Vault exists.
- The agent-noticed-commitment rule increases Inbox volume slightly; the price of one
  authoritative loop list.
- If the Vault dies, LIVAL OS loses a Producer and some Projections go stale. Nothing
  authoritative is lost — by construction.
