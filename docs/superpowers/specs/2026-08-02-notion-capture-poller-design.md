# Notion Capture Poller — Design

Date: 2026-08-02
Status: **Approved (design). Build deferred** — see §1.1.
Supersedes: `2026-06-24-n8n-gmail-capture-design.md` as the transport design for
Notion capture. That document is HISTORICAL; its n8n transport was rejected on
2026-08-02 (`docs/decisions/2026-08-02-scope-reset.md`, PRD §11.3). Its *write-side*
work — the `suggested_*` / `confidence` fields on `ingest-quick-capture` — was built
and is live; see §4.

## 1. Purpose

Give LIVAL OS a second phone-side capture path: a Notion database that acts as a
browsable queue, polled into `inbox_items`.

Direction is **inverted** from the retired prototype. Notion is a capture *source*
read *from*. Nothing in Supabase is ever mirrored *into* Notion. See §5.3 for the one
narrow exception this design does make, and why it is an acknowledgement rather than
a mirror.

### 1.1 This is a design for work that is deliberately not scheduled

PRD §11.3 and §17.5 defer the poller pending two weeks of Apple-Shortcut-only capture.
If the Shortcut covers it, **this never gets built** and that is a success, not a
failure — the Shortcut is one tap with no service to keep alive.

This document exists because the repo's rule is spec-before-code and because the
decision it encodes (idempotency, §5) is the reason the naive version of this feature
would silently corrupt the Inbox. Writing it now means the two-week review is a
go/no-go on a costed design rather than a fresh design session.

**Estimated build: ~4h**, unchanged from the PRD estimate. §9 breaks it down.

## 2. Why this shape

### 2.1 Transport: `pg_cron` + `pg_net`, not n8n

n8n is running (`~/Developer/_services/n8n`) and hosts real client flows. It is still
rejected here: this is one scheduled HTTP call, and Postgres schedules it natively.
Adding a Notion trigger to n8n means a second always-on service in the critical path
of personal capture, plus a workflow whose logic lives outside version control.

Decided 2026-08-02. The consolidation plan's own Phase G description predates that
decision and still says "swap the Gmail Trigger for a Notion Trigger" — **that
sentence is stale.**

### 2.2 No AI routing in v1 — deviation from the n8n design

The n8n spec ran every captured item through Claude Haiku to guess
`suggested_area_id` / `confidence`. That made sense for *email*, where the item is
written by someone else and arrives unclassified in volume.

Notion capture is neither. Items are hand-typed by the one user, a handful a day, and
the user already knows which Area they belong to at the moment of typing. **A Notion
`Area` select property is one extra tap, is always right, and costs nothing.** An LLM
guess is slower, is sometimes wrong, and would put `ANTHROPIC_API_KEY` into Supabase —
which the n8n design explicitly avoided doing, for the same reason.

So: the poller maps the Notion `Area` select to `suggested_area_id` through a static
id map (§6.3), with `confidence: 1.0` when the user picked one and the field omitted
when they did not.

Revisit only if capture volume ever makes tapping a dropdown feel like friction. Per
PRD §4, friction between impulse and record is the thing this app exists to remove —
if the dropdown ever becomes that friction, drop the property, not the design.

### 2.3 A new capture database, not a surviving prototype mirror

PRD §11.4 counts seven prototype Notion databases (Tasks, Projects, Brain Dump, Inbox,
Resources, Wins, Archive). None of them is the right shape to survive: each is a
*mirror* of a Supabase table, with columns that exist to reflect state back, not to
accept input.

Build one new database, `LIVAL Capture`, with the five properties in §6.1 and nothing
else. Then retire all seven mirrors (§8).

## 3. Flow

```
pg_cron (*/15 * * * *)
  → pg_net.http_post → edge function `poll-notion-capture`
      → read cursor from integrations.config->>'last_polled_at'
      → Notion API: query LIVAL Capture data source
           filter: Synced is false
           sort:   created_time ascending
           page_size: 25
      → for each page:
           map → POST body (§6.2)
           → ingest-quick-capture   (external_ref = Notion page id)
           → on 201: Notion PATCH page  Synced = true
      → advance cursor, write automation_runs row
```

One direction of data, one endpoint, no new write path into `inbox_items`. The poller
is a *producer* hitting the same bearer-gated endpoint the Shortcut and the Claude Code
hooks already use.

**15 minutes, not 1.** A capture queue you browse on the phone does not need
sub-minute latency, and every tick is a Notion API call whether or not anything is
waiting. If a specific item is urgent, the Shortcut path is instant — that is what it
is for.

## 4. What already exists

The n8n spec's §4 was built and shipped. `ingest-quick-capture` already accepts
`suggested_area_id`, `suggested_workspace_id`, `suggested_project_id`, and
`confidence` (`supabase/functions/ingest-quick-capture/handler.ts:12-15`, mapped at
`:44-47`, covered by tests at `handler_test.ts:41-102`).

**No change to that handler is needed for routing.** The only handler change this
design requires is `external_ref`, §5.

## 5. Idempotency — the part that must not be skipped

### 5.1 The defect in the naive version

`inbox_items` has **no unique constraint and no idempotency key** (migration 001,
`:109-127`). `ingest-quick-capture` has no dedup. Every other consumer of that endpoint
is fire-once — a Shortcut tap, a session hook — so this has never mattered.

A poller is not fire-once. Any retry, any overlapping tick, any cursor reset, any
Notion write-back that fails after a successful insert produces a **duplicate Inbox
row**. In an app whose stated purpose is reducing the cost of triage, silently doubling
the triage queue is the worst available failure.

### 5.2 Fix: `external_ref` on `inbox_items`

Mirror what migration 003 already did for `time_entries`:

```sql
-- supabase/migrations/00N_inbox_items_external_ref.sql
alter table public.inbox_items
  add column if not exists external_ref text;

create unique index if not exists inbox_items_user_external_ref_uniq
  on public.inbox_items (user_id, external_ref)
  where external_ref is not null;
```

Additive. Existing rows get `null` and are unaffected; the partial index ignores them.
Existing producers keep working unchanged.

`external_ref` = the Notion page id. It is stable across edits, so re-reading the same
page is a no-op forever, not just within one poll window.

Handler change, mirroring `ingest-time-entry`: accept optional `external_ref`, upsert
on conflict, return 200 with the existing row instead of 201. Tests: insert, re-insert
same ref → one row; omit ref → still inserts (no regression).

> Number this migration **after** `004_reset_areas.sql` (PRD §17.2 task 3), which is
> already claimed. Do not take `004`.

### 5.3 Second layer: the `Synced` checkbox

The DB index is the guarantee. The `Synced` checkbox is what makes the queue usable:
it is how the phone shows you what has already landed, and it keeps the poll filter
narrow so a growing capture history does not mean growing API pages.

This is the one write back into Notion, and it is worth being precise about why it does
not violate PRD §11.3. The prohibition is on Notion holding a *copy of application
state* — projects, tasks, statuses — which is what made the prototype unmaintainable.
A boolean meaning "LIVAL has this one" is an acknowledgement of transfer. Nothing in
Notion becomes authoritative, and nothing reads back from it.

If the write-back call fails after a successful insert, the item is polled again next
tick and the unique index absorbs it. **The checkbox is allowed to be wrong; the index
is not.**

### 5.4 Cursor

`integrations` (migration 002) exists and is unwired. Use it:

| column | value |
|---|---|
| `provider` | `notion` |
| `display_name` | `LIVAL Capture` |
| `status` | `active` / `error` |
| `config` | `{"database_id": "...", "data_source_id": "...", "last_polled_at": "<iso8601>", "area_map": {...}}` |

The cursor is an optimisation, not a correctness mechanism — `Synced is false` plus the
unique index are what make the poller safe. Losing the cursor costs one wider query.

## 6. Contracts

### 6.1 Notion database — `LIVAL Capture`

| Property | Type | Maps to |
|---|---|---|
| `Name` | title | `title` (required) |
| `Notes` | rich text | `body` |
| `Type` | select — `idea` \| `task` \| `note` \| `resource` | `type` (default `note`) |
| `Area` | select — the 5 areas of PRD §6.2 | `suggested_area_id` via §6.3 |
| `Synced` | checkbox, default false | poll filter, §5.3 |

`Type` options are a subset of the `inbox_items.type` check constraint. Do not add an
option to Notion without adding it there — the endpoint 400s on an unknown value, and
the poller would then retry that page every tick forever. §7 covers that failure.

### 6.2 POST body

```json
{
  "title": "<Name>",
  "body": "<Notes, or omitted>",
  "type": "<Type, default note>",
  "source": "notion",
  "source_url": "https://notion.so/<page id, dashes stripped>",
  "external_ref": "<Notion page id>",
  "suggested_area_id": "<from §6.3, or omitted>",
  "confidence": 1.0
}
```

Omit `suggested_area_id` and `confidence` entirely when `Area` is empty. Do not send
`null` — `docs/ingestion/README.md` already documents this, and the Zod schema treats
those fields as optional, not nullable.

`source: "notion"` is a free-text column, so no migration is needed for it. It is what
makes Inbox triage able to tell a Notion item from a Shortcut item.

### 6.3 Area map

`integrations.config->'area_map'`: `{"Consulting": "<uuid>", "VI": "<uuid>", ...}`,
populated once from the live `areas` table **after** `004_reset_areas.sql` lands.

Same tradeoff the n8n design reached for its routing list, and the same reasoning:
areas change a few times a year. A live lookup would need a second endpoint or a
service-role read on every tick, to avoid an edit that takes thirty seconds a year.

An unrecognised `Area` string is not an error — omit the suggestion and capture the
item anyway. **Never drop a capture because its metadata did not resolve.**

## 7. Failure handling

| Failure | Behaviour |
|---|---|
| Notion API 5xx / timeout | Abort the tick. Do not advance the cursor. Next tick retries. |
| Notion 401 | Set `integrations.status = 'error'`. Stop. Token was revoked or expired. |
| `ingest-quick-capture` 400 (bad `type`, missing title) | Skip that page, leave `Synced` false, log to `automation_runs.error_message`, continue the batch. |
| 400 repeats on the same page id | Poison-pill. After 3 ticks, set `Synced = true` to eject it and log `status = 'partial'`. |
| Insert succeeds, Notion write-back fails | Accept. Unique index absorbs the re-poll (§5.3). |
| Two ticks overlap | Unique index absorbs it. `pg_cron` does not overlap the same job by default. |

The poison-pill rule matters: without it, one malformed row blocks nothing but generates
an error every 15 minutes forever, which trains you to ignore the error log.

**Run logging writes to `automation_runs`.** That table is unwired today; PRD §17.3
task 13 wires it. If task 13 has not landed when this is built, do it here for this job
only — a scheduled job with no run log is a job that fails silently, which is precisely
what happened to `lival-sync-daily` (PRD §12).

## 8. Retiring the seven prototype databases

Once this ships **and one week of captures has landed clean**, the seven mirrors from
PRD §11.4 have no remaining job.

They hold prototype data and deletion is irreversible. **Delete them by hand, from the
Notion UI, after exporting.** Do not script it and do not have an agent do it — there
is no recovery path and no upside to automating a one-time destructive action on a
live account.

Order: export → confirm the export opens → delete → confirm the poller still runs.

## 9. Definition of done

1. Migration `00N_inbox_items_external_ref.sql` written and applied.
2. `ingest-quick-capture` accepts `external_ref`, upserts on conflict, returns 200 on
   an existing ref. New Deno tests pass alongside the existing 28. Redeployed and
   live-verified with a duplicate POST → one row.
3. `LIVAL Capture` database created in Notion with the §6.1 properties.
4. Notion internal integration created, granted access to that database only,
   token stored as a Supabase function secret (§10).
5. `poll-notion-capture` edge function written, tested, deployed `--no-verify-jwt`.
6. `integrations` row seeded with `database_id`, `data_source_id`, `area_map`.
7. `pg_cron` job scheduled at `*/15 * * * *`; secret read from Vault (§10).
8. Live-verified end to end: three real captures — one with an Area, one without, one
   with a deliberately bad `Type` — land correctly, `Synced` flips, the bad one ejects
   after 3 ticks, and `automation_runs` shows the runs.
9. `docs/ingestion/README.md` gets a Notion producer section, mirroring the existing
   Claude Code hook and Apple Shortcut sections.
10. PRD §11.3 updated from "deferred" to "live".

Steps 1–2 are the only ones that touch shipped code, and they are independently useful:
they close a real idempotency hole in `inbox_items` whether or not the poller is ever
built.

## 10. Secrets

Two secrets, neither in this repo:

- **`NOTION_API_KEY`** — internal integration token, scoped to the `LIVAL Capture`
  database only. Set with `supabase secrets set`. Grant it access to that one database
  in the Notion UI; do not share the parent page.
- **`LIVAL_INGEST_SECRET`** — existing bearer, reused, not regenerated.

**The `pg_cron` schedule must not embed the bearer in its command string.**
`cron.job.command` is stored as plain text in a table readable by the `postgres` role
and visible in the Supabase dashboard's SQL editor to anyone with project access. Read
it from Supabase Vault instead:

```sql
select cron.schedule(
  'poll-notion-capture',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1/poll-notion-capture',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'lival_ingest_secret'
      )
    )
  );
  $$
);
```

Enable `pg_cron`, `pg_net`, and `supabase_vault` in Dashboard → Database → Extensions
first. **No service-role key leaves Supabase at any point**, and none of it enters this
repo.

## 11. Out of scope

- **AI classification / routing** — §2.2. The `Area` select replaces it.
- **`suggested_workspace_id` / `suggested_project_id`** — Area is the coarsest useful
  routing level and the only one worth a tap on a phone. Workspace and project
  assignment stay in the Inbox conversion flow.
- **Writing anything else back to Notion.** The `Synced` checkbox is the whole write
  surface (§5.3).
- **Gmail capture.** The 2026-06-24 design covered it; it was never built and is not
  revived here. Email triage is a different problem with different volume.
- **A Notion producer for anything other than `inbox_items`.**

## 12. No implementation plan yet

Repo convention pairs every spec with a `plans/` document. There is deliberately no
plan for this one: the build is gated on the §1.1 two-week review, and a plan written
now would be stale by the time that review happens.

Write the plan if and when the review says build.
