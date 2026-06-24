# n8n Gmail Capture Workflow — Design

Date: 2026-06-24
Status: Approved (design)
Branch: none (n8n workflow, not a code change to this repo — JSON export checked in for version control)

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

## 2. Why n8n (not a new edge function)

n8n is already running self-hosted in Docker (`~/Developer/_services/n8n`,
port 5678) for personal + client automation. The existing `ingest-quick-capture`
edge function (deployed, bearer-gated, writes `inbox_items`) is exactly the
shape this needs — n8n becomes a thin producer hitting a stable endpoint, the
same pattern Claude Code hooks and the Apple Shortcut already use
(`docs/ingestion/README.md`). No new edge function, no new Supabase secret.

Classification logic (AI importance judgment) lives **in the n8n workflow**,
not server-side, so the prompt can be tweaked visually in n8n without a
redeploy. Considered and rejected: a new `ingest-gmail-event` edge function
that does classification server-side — adds a second AI secret
(`ANTHROPIC_API_KEY`) to Supabase, and loses in-place prompt editing for no
real benefit since this is a single-user, low-volume workflow.

## 3. Workflow design

```
Gmail Trigger (poll, account: valentinoliana@gmail.com, unread, any category)
   → HTTP Request: Claude Haiku — classify email
   → IF: importance == true
       → true branch:
           → HTTP Request: POST ingest-quick-capture (Bearer LIVAL_INGEST_SECRET)
           → Gmail: add label "LIVAL/Processed", mark read
       → false branch:
           → Gmail: mark read (no capture)
```

### Gmail Trigger node

- Account: `valentinoliana@gmail.com` (n8n Gmail OAuth credential).
- Filter: unread, no category restriction (catches calendar/appointment mail
  Gmail sometimes miscategorizes out of Primary).
- Poll interval: n8n default (1 min) is fine — personal mailbox, low volume.

### Claude Haiku classification (HTTP Request node)

- Model: `claude-haiku-4-5` via Anthropic Messages API
  (`https://api.anthropic.com/v1/messages`), header `x-api-key` from n8n
  credential `ANTHROPIC_API_KEY` (never committed).
- Input: subject, sender, snippet/body (truncated — no need to send full long
  threads to the model).
- Importance rule given to the model: **important if EITHER** (a) actionable,
  time-sensitive, has a deadline, or is a calendar/scheduling invite, **OR**
  (b) the sender is a real person (not an automated/no-reply/marketing
  sender) — regardless of content. Skip newsletters, receipts, marketing,
  pure-FYI automated mail that fails both conditions.
- Required JSON output (enforced via prompt + n8n expression parsing):
  ```json
  {
    "important": true,
    "type": "email",
    "title": "short subject-derived title",
    "summary": "1-2 sentence summary"
  }
  ```
  `type` is `"appointment"` when the email is a calendar/scheduling invite,
  otherwise `"email"`.
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
    "source_url": "https://mail.google.com/mail/u/0/#inbox/<gmail message id>"
  }
  ```
- Existing endpoint validates/inserts unmodified — no contract change.

### Post-processing (both branches)

- Mark the Gmail message read.
- True branch additionally adds label `LIVAL/Processed`.

## 4. Dedup / idempotency

`inbox_items` has no idempotency key (consistent with `file_changes` and
`activity_events` — only `time_entries.external_ref` has one, per Phase 3).
n8n's Gmail Trigger only returns messages new since its last poll, which is
the primary guard against duplicates in normal operation. The
`LIVAL/Processed` label is the secondary safety net: it makes already-handled
messages visually identifiable and protects against a poll-state reset
re-scanning old unread mail. It does **not** prevent a duplicate row if the
same message is manually re-run through the workflow — accepted risk for a
personal-use, manually-supervised workflow.

## 5. Secrets

- `ANTHROPIC_API_KEY` — new n8n credential, used only by this workflow's
  HTTP Request node to Claude. Not stored in this repo.
- `LIVAL_INGEST_SECRET` — existing n8n credential (bearer secret), reused
  from Phase 3 deployment. Not regenerated.
- Gmail OAuth — existing n8n Gmail credential, or newly authorized against
  `valentinoliana@gmail.com` if not already present.

## 6. Rollout safety

Per `~/Developer/_services/n8n/CLAUDE.md`'s own hard rules ("never trigger a
production flow from a Claude session without explicit confirmation," "test
flows in n8n's test mode before activating"):

1. Build the workflow in n8n inactive/test mode.
2. Manually execute it against a handful of real unread emails (mix of
   important and skippable) and inspect both the Claude classification output
   and the resulting `inbox_items` rows.
3. Only after explicit user confirmation, activate the workflow for live
   polling.

This workflow is additive to the shared n8n instance and does not modify or
interact with existing ETD client flows running there.

## 7. Out of scope (still deferred)

- `automation_runs` run-logging — explicitly deferred in favor of this item
  (user choice, 2026-06-24). This workflow does not write to
  `automation_runs`.
- Any UI surface for reviewing AI-classification accuracy — rows land in
  `inbox_items` via the existing Inbox view; no new UI.
- Workflow JSON version control automation beyond a manual export — per
  n8n's own `CLAUDE.md` TODO, export to `flows/<name>.json` there is a
  separate housekeeping task, not blocking this workflow.

## 8. Definition of done

1. Workflow built in n8n, inactive.
2. Manual test run against real unread mail: Claude classification looks
   sane (spot-check a few important + a few skipped), `inbox_items` rows from
   the true branch match the mapping in section 3, processed messages get
   `LIVAL/Processed` + marked read.
3. User confirms results; workflow activated for live polling.
4. `docs/ingestion/README.md` gets an n8n producer section (mirrors the
   existing Claude Code hook / Apple Shortcut sections).
5. Kanban gets a new task row `3-11` ("n8n: Gmail capture workflow") added
   to the existing "Ingestion Endpoints (Edge Functions)" phase — CLAUDE.md
   already frames n8n wiring as part of Phase 3 ingestion scope, so it stays
   under that phase rather than a new one.
