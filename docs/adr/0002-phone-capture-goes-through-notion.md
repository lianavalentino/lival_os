# Phone capture goes through Notion, not an Apple Shortcut

The phone-side Capture Path is a Notion database polled into `inbox_items`. The Apple
Shortcut is dropped, not deferred, and iMessage was considered and rejected. The phone never
POSTs to Supabase at all: it writes to Notion, and Postgres pulls on a schedule.

Decided 2026-08-04. Supersedes PRD §11.2's designation of the Shortcut as "the primary
capture path".

## Why the Shortcut was dropped

It does not work, for reasons outside this project. Every run fails
`NSURLErrorNetworkConnectionLost` (-1005) with nothing reaching the server, verified by
querying `inbox_items` after each attempt rather than trusting the on-screen error. Six
rounds of debugging ruled out the endpoint, cold start, the bearer header, the JSON body,
and the input variable. Safari on the same phone gets a clean 405 from the same URL.

The diagnosis is HTTP/3, and it is now evidenced rather than suspected: the Supabase edge
function returns `alt-svc: h3=":443"; ma=86400` and the Vercel deployment advertises no
`alt-svc` at all. Safari falls back to HTTP/2; Shortcuts does not.

The available fix was a thin Vercel route in front of `ingest-quick-capture`. That is a new
component the architecture has no slot for, and it puts a **second copy of
`LIVAL_INGEST_SECRET`** into Vercel, against a security invariant that says the secret lives
in exactly two places. Notion buys the same outcome without either.

## Why the deferral was reopened early

PRD §11.3, §17.5, and the poller design's own §1.1 all gated the Notion build on "two weeks
of Apple-Shortcut-only capture." The Shortcut cannot run, so that condition can never be
satisfied and the go/no-go review would never fire. The deferral was unreachable rather than
pending.

## Why not iMessage

Apple ships no server-side iMessage API — no webhook, no bot endpoint. Every integration
works by reading `~/Library/Messages/chat.db` on a signed-in Mac. That means either a
persistent Claude Code channel session (an LLM in a path that should be dumb, failing
silently when the session is down) or a custom launchd poller (deterministic, but still Mac-
dependent and still a second pipeline). The durable-queue property is genuinely attractive —
nothing is lost while the Mac sleeps — but not enough to outweigh a capture path that stops
working when a laptop lid closes.

Recorded so it is not re-proposed. The zero-build fallback remains available at any time:
tell Siri to text yourself, and triage it by hand.

## Consequences

- Notion stays alive as infrastructure in the personal capture path, which the 2026-08-02
  scope reset had otherwise been shrinking. This does not violate "Supabase is the only
  system of record": Notion is a Producer read *from*, never a mirror written *to*. The one
  write back is a `Synced` checkbox acknowledging transfer.
- Capture-to-Inbox latency becomes 15 minutes, the poll interval. The poller design
  justified that with "if a specific item is urgent, the Shortcut path is instant" — that
  sentence assumed a working Shortcut and no longer holds. 15 minutes is now the only
  latency. Acceptable because triage is asynchronous by nature, but it is a real change from
  what the PRD promised.
- The Shortcut's three advantages are covered elsewhere: the home-screen icon by installing
  the app to the home screen as a PWA, the share sheet by Notion's own share extension, and
  hands-free capture by Siri into Notion.
- Notion or its token going down stops this Capture Path. Quick Capture in the app is
  unaffected, so capture degrades rather than stopping.
