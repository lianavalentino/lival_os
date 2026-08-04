# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the
actual label strings used in this repo's issue tracker.

**This repo deliberately does not use the default vocabulary.** It matches
`clients/italian-bistro`, which has run this scheme over ~93 issues. One vocabulary across
every repo means one mental model, and `/triage` behaving the same wherever it is run.

| Role in mattpocock/skills | Label here        | Meaning                                                 |
| ------------------------- | ----------------- | ------------------------------------------------------- |
| `needs-triage`            | `backlog`         | Not now — a future phase. Renders in the Backlog column. |
| `needs-info`              | `needs:owner`     | Blocked on Liana for information or a decision.         |
| `ready-for-agent`         | `ready-for-agent` | Fully specified, ready for an AFK agent.                |
| `ready-for-human`         | `needs:owner`     | Requires Liana — dashboard, credentials, a live system. |
| `wontfix`                 | `wontfix`         | Will not be actioned.                                   |

`needs-triage` and `needs-info` were created here on 2026-08-04 and retired the same day,
before either was used, when this repo adopted the italian-bistro vocabulary. `needs:owner`
covers both of the roles that would otherwise need them — in a single-user project the
distinction between "waiting on the reporter" and "requires human implementation" collapses,
because the reporter and the implementer are the same person.

## Structure labels

Not triage roles — how the board is organised.

| Label | Meaning |
| --- | --- |
| `epic` | A parent issue tracking child issues. Titled `Epic: <Name>`. |
| `epic:<slug>` | Membership — which epic a child issue belongs to. |
| `area:eng` | Code work. |
| `area:business` | Real-world action: invoices, credentials, decisions, anything outside the codebase. |

Epic membership is by **label**, not by GitHub sub-issues. Blocking between issues does use
GitHub's native dependencies — see `issue-tracker.md`.

An epic body carries prose context, links to the ADRs and specs behind it, a numbered build
order for its children, and a separate list of out-of-band actions only Liana can perform.
That last section is what keeps dashboard and credential steps from being silently handed to
an agent.
