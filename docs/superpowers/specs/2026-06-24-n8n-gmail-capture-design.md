# n8n Gmail Capture Workflow — Design

> **HISTORICAL — do not edit.** This is a dated decision record from the date above.
> It describes what was decided and built *then*, not what is true now. It is kept
> unmodified on purpose. For current scope see [`PRD.md`](../../../PRD.md); for current
> build state see [`CLAUDE.md`](../../../CLAUDE.md).

Date: 2026-06-24
Status: Approved (design)
Branch: `ingest-quick-capture` modification goes through the normal
size-based branch policy at plan time; the n8n workflow itself is not a code
change to this repo (JSON export checked in for version control only).

## 1. Purpose

Phase 3 ingestion endpoints are deployed and live-verified
(`docs/superpowers/specs/2026-06-17-phase3-ingestion-edge-functions-design.md`,
`docs/superpowers/specs/2026-06-23-ingest-file-change-design.md`,
`docs/superpowers/specs/2026-06-23-ingest-activity-event-design.md`). `CLAUDE.md`
flagged two items as still deferred from that scope: `automation_runs` logging
and n8n producer wiring. This spec closes the second item.

PRD target (`LIVAL_OS_Codex_PRD_v1.md:729-734`, Phase 4 in that doc's own
numbering): "Gmail or n8n workflow creates inbox items for client emails and
appointments." This is the first concrete n8n → LIVAL OS workflow.

Beyond the PRD's literal ask, the workflow also routes captured emails toward
the right `Area`/`Workspace`/`Project` (e.g. recognizing client-related mail
as belonging to the `Consulting` area) using columns that already exist on
`inbox_items` (`suggested_area_id`, `suggested_workspace_id`,
`suggested_project_id`, `confidence` — migration 001) but that no current
producer populates.

## 2. Why n8n, and why no new edge function

n8n is already running self-hosted in Docker (`~/Developer/_services/n8n`,
port 5678) for personal + client automation. The existing `ingest-quick-capture`
edge function (deployed, bearer-gated, writes `inbox_items`) is the same
shape this needs for the *write* side — n8n becomes a thin producer hitting a
stable endpoint, the pattern Claude Code hooks and the Apple Shortcut already
use (`docs/ingestion/README.md`).

Classification logic (AI importance judgment + routing suggestion) lives
**in the n8n workflow**, not server-side, so the prompt can be tweaked
visually in n8n without a redeploy. Considered and rejected: a new
`ingest-gmail-event` edge function that does classification server-side —
adds a second AI secret (`ANTHROPIC_API_KEY`) to Supabase and loses in-place
prompt editing for no real benefit on a single-user, low-volume workflow.

Routing needs the current list of areas/workspaces/projects to match
against. A first pass of this design added a second new edge function
(`list-routing-targets`) to fetch that list live on every run, reasoning that
RLS blocks anon-key reads and the service-role key shouldn't leave Supabase.
That's still true, but it's solving a problem this app doesn't have: areas
and projects are personal-app data that changes a handful of times a year,
not a live feed that needs always-fresh reads. **Simplification:** the
area/workspace/project id+name list is hardcoded as a static JSON block
inside the n8n workflow (a Set/Code node), populated once from the live
Supabase data at build time. Adding a new area or project later means
pasting its id+name into that block — a manual edit, not ongoing
maintenance. This drops an entire edge function (code, tests, deploy,
redeploy-on-schema-change) from scope for a cost that's lower than the
maintenance burden of the function it replaces.

## 3. Workflow design

```
Gmail Trigger (poll, account: valentinoliana@gmail.com, unread, any category)
   → HTTP Request: Claude Haiku — classify + route email (given static routing list)
   → IF: important == true
       → true branch:
           → HTTP Request: POST ingest-quick-capture (Bearer LIVAL_INGEST_SECRET)
           → Gmail: add label "LIVAL/Processed", mark read
       → false branch:
           → Gmail: mark read (no capture)
```

### Static routing list (Set/Code node)

- A JSON block in the workflow, e.g.:
  ```json
  {
    "areas": [{ "id": "<uuid>", "name": "Consulting" }, ...],
    "workspaces": [{ "id": "<uuid>", "name": "...", "area_id": "<uuid>" }, ...],
    "projects": [{ "id": "<uuid>", "name": "...", "workspace_id": "<uuid>" }, ...]
  }
  ```
- Populated once at workflow-build time by querying the live `areas` /
  `workspaces` / `projects` tables for the real ids/names (dashboard SQL
  editor or the app itself) and pasting the result in. Not derived from
  `src/data/seed.ts` — that's demo-mode fallback data, not the live rows.
- Merged into the Claude prompt as the list of valid routing targets.
- Living in the n8n workflow JSON (exported to the repo per section 7), so a
  `git diff` shows when it's updated.

### Gmail Trigger node

- Account: `valentinoliana@gmail.com` (n8n Gmail OAuth credential).
- Filter: unread, no category restriction (catches calendar/appointment mail
  Gmail sometimes miscategorizes out of Primary).
- Poll interval: n8n default (1 min) is fine — personal mailbox, low volume.

### Claude Haiku classification + routing (HTTP Request node)

- Model: `claude-haiku-4-5` via Anthropic Messages API
  (`https://api.anthropic.com/v1/messages`), header `x-api-key` from n8n
  credential `ANTHROPIC_API_KEY` (never committed).
- Input: subject, sender, snippet/body (truncated), plus the static
  areas/workspaces/projects list.
- Importance rule: **important if EITHER** (a) actionable, time-sensitive,
  has a deadline, or is a calendar/scheduling invite, **OR** (b) the sender
  is a real person (not an automated/no-reply/marketing sender) — regardless
  of content. Skip newsletters, receipts, marketing, pure-FYI automated mail
  that fails both conditions.
- Routing rule: match the email to the best-fitting area/workspace/project
  from the static list if a clear match exists (e.g. client-named sender or
  project keyword → `Consulting` area and the matching project); otherwise
  leave the suggestion fields `null` and let `confidence` reflect that. No
  task-level suggestion — task assignment stays a manual step in the
  existing Inbox conversion flow; guessing a specific task from an email is
  too granular to be reliable.
- Required JSON output (enforced via prompt + n8n expression parsing):
  ```json
  {
    "important": true,
    "type": "email",
    "title": "short subject-derived title",
    "summary": "1-2 sentence summary",
    "suggested_area_id": "<uuid or null>",
    "suggested_workspace_id": "<uuid or null>",
    "suggested_project_id": "<uuid or null>",
    "confidence": 0.0
  }
  ```
  `type` is `"appointment"` when the email is a calendar/scheduling invite,
  otherwise `"email"`. When no routing match is found, all four routing
  fields (`suggested_area_id`/`suggested_workspace_id`/`suggested_project_id`/
  `confidence`) are `null` together — the `inbox_items.confidence` column
  already permits `null` (migration 001's check constraint is
  `confidence is null or (confidence between 0 and 1)`), so this needs no
  special-casing. When a match is found, `confidence` is that match's score.
- On a malformed/unparseable Claude response: treat as `important: false`
  (skip, mark read). No retry — a single missed email is low-stakes and the
  next poll cycle is not a recovery path for the same message once marked
  read, but failures here are expected to be rare malformed-JSON edge cases,
  not a systemic dependency to harden against for a personal-use workflow.

### IF node — importance gate

- Branches on `important == true` from the Claude response.

### POST to ingest-quick-capture (true branch)

- `POST https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1/ingest-quick-capture`
- Header: `Authorization: Bearer <LIVAL_INGEST_SECRET>` (n8n credential, same
  secret already issued in Phase 3 — not regenerated).
- Body:
  ```json
  {
    "title": "<from Claude>",
    "body": "<Claude summary, not raw email body>",
    "type": "<email|appointment, from Claude>",
    "source": "n8n",
    "source_url": "https://mail.google.com/mail/u/0/#inbox/<gmail message id>",
    "suggested_area_id": "<from Claude, or omitted if null>",
    "suggested_workspace_id": "<from Claude, or omitted if null>",
    "suggested_project_id": "<from Claude, or omitted if null>",
    "confidence": "<from Claude>"
  }
  ```
- Requires the `ingest-quick-capture` modification in section 4 below — the
  deployed handler currently drops these fields.

### Post-processing (both branches)

- Mark the Gmail message read.
- True branch additionally adds label `LIVAL/Processed`.

## 4. Modify `ingest-quick-capture`

- `quickCaptureSchema` (Zod) gains four optional fields:
  `suggested_area_id` (`z.string().uuid().optional()`),
  `suggested_workspace_id` (same), `suggested_project_id` (same),
  `confidence` (`z.number().min(0).max(1).optional()`).
- `InboxRow` / `toInboxRow` map them straight through (`null` when omitted —
  same optional-field pattern already used for `body`/`source_url`).
- Backward compatible: every existing producer (Claude Code hook, Apple
  Shortcut) keeps working unchanged since the new fields are optional.
- New test cases added to `handler_test.ts`: row includes suggested_* fields
  when provided, row has `null`s when omitted (existing producers unaffected).
- This is the only code change in this spec.

## 5. Dedup / idempotency

`inbox_items` has no idempotency key (consistent with `file_changes` and
`activity_events` — only `time_entries.external_ref` has one, per Phase 3).
n8n's Gmail Trigger only returns messages new since its last poll, which is
the primary guard against duplicates in normal operation. The
`LIVAL/Processed` label is the secondary safety net: it makes already-handled
messages visually identifiable and protects against a poll-state reset
re-scanning old unread mail. It does **not** prevent a duplicate row if the
same message is manually re-run through the workflow — accepted risk for a
personal-use, manually-supervised workflow.

## 6. Secrets

- `ANTHROPIC_API_KEY` — new n8n credential, used only by this workflow's
  HTTP Request node to Claude. Not stored in this repo.
- `LIVAL_INGEST_SECRET` — existing n8n credential (bearer secret), reused
  from Phase 3 deployment. Not regenerated.
- Gmail OAuth — existing n8n Gmail credential, or newly authorized against
  `valentinoliana@gmail.com` if not already present.
- No service-role key in n8n at any point.

## 7. Rollout safety

Per `~/Developer/_services/n8n/CLAUDE.md`'s own hard rules ("never trigger a
production flow from a Claude session without explicit confirmation," "test
flows in n8n's test mode before activating"):

1. Ship and live-verify the `ingest-quick-capture` change first (deno tests +
   curl), same definition-of-done bar as every other Phase 3 endpoint.
2. Build the n8n workflow in inactive/test mode, including the static
   routing-list block populated from live area/workspace/project ids.
3. Manually execute it against a handful of real unread emails (mix of
   important/skippable, and mix of client/non-client) and inspect the Claude
   output, the routing suggestions, and the resulting `inbox_items` rows.
4. Only after explicit user confirmation, activate the workflow for live
   polling.

This workflow is additive to the shared n8n instance and does not modify or
interact with existing ETD client flows running there.

## 8. Out of scope (still deferred)

- `automation_runs` run-logging — explicitly deferred in favor of this item
  (user choice, 2026-06-24). This workflow does not write to
  `automation_runs`.
- Task-level routing suggestions (`suggested_task_id`) — left null/unused;
  too granular to guess reliably from an email, stays a manual step.
- Live/dynamic routing-target lookup — rejected in favor of the static list
  (section 2). Revisit only if areas/projects start changing often enough
  that manual upkeep of the static block becomes a real burden.
- Any UI surface for reviewing AI-classification accuracy — rows land in
  `inbox_items` via the existing Inbox view; no new UI. (Note: the Inbox
  view's conversion flow may or may not currently surface
  `suggested_area_id` etc. to the user — verifying/wiring that display is
  not part of this spec; it's a pre-existing UI gap if so.)
- Workflow JSON version control automation beyond a manual export — per
  n8n's own `CLAUDE.md` TODO, export to `flows/<name>.json` there is a
  separate housekeeping task, not blocking this workflow.

## 9. Definition of done

1. `ingest-quick-capture` modification: deno tests pass (old + new cases),
   redeployed, live-verified that a request with suggested_* fields inserts
   correctly and a request without them still works (no regression for
   existing producers).
2. n8n workflow built in n8n, inactive, with the static routing list
   populated from real area/workspace/project ids.
3. Manual test run against real unread mail: Claude classification and
   routing suggestions look sane (spot-check a few important + a few
   skipped, a few client-routed + a few with no match), `inbox_items` rows
   match the mapping in section 3, processed messages get `LIVAL/Processed`
   + marked read.
4. User confirms results; workflow activated for live polling.
5. `docs/ingestion/README.md` gets an n8n producer section (mirrors the
   existing Claude Code hook / Apple Shortcut sections).
6. Kanban gets new task rows under the existing "Ingestion Endpoints (Edge
   Functions)" phase — CLAUDE.md already frames n8n wiring as part of Phase 3
   ingestion scope, so this stays under that phase rather than a new one:
   `3-11` ("Modify ingest-quick-capture for routing suggestions"), `3-12`
   ("n8n: Gmail capture workflow").
