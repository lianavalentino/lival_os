# LIVAL OS — Handoff Document
**Date:** June 16, 2026
**Status:** v5 — live, **Notion-backed** (persists across reloads)

> **Decision locked (this session):** Notion is the source of truth; the `lival-os` Cowork artifact is the keeper. We evaluated Google Sheets (no cell write-back — rejected), localStorage (device-local only — rejected for now), and a local app (deferred). **Next open thread: a TASKS.md → Notion sync bridge** so the app tracks the projects in `~/Developer` subfolders. Not built yet — spec is below.

---

## What Was Built (v5)

LIVAL OS is now wired to **live Notion databases** instead of in-memory data. The app reads from Notion on load and writes back on every mutation, so state survives reloads.

- **PRD:** `/Users/liana/Developer/LIVAL_OS_PRD.md` (full product vision)
- **Source:** `/Users/liana/Developer/lival-os.html`
- **Live artifact:** **`lival-os`** ← publish target (NOT `daily-command-center`, which is the older copy)

### Live (reads + writes to Notion)
- Board — reads tasks; **drag-and-drop** between columns writes Status back
- Task side panel — **Mark Done / Move Status → / Flag Blocked** write Status
- Add Task / Brain Dump / Add Resource / New Project modals — **save to Notion**
- Brain Dump "→ Task" promote; Inbox "Convert to Task" — create Notion task pages
- Command Center stats, Daily/Weekly planner, Projects, Project Detail — all render from live data
- Reports — Overview KPIs, Time Allocation donut (live hours), Project Investment, Tasks-by-status/area, Project Health, and a **Trends** chart (momentum + hours by week)
- Topbar **⟳ refresh** + per-write auto-refresh; toast feedback on every write

---

## Backend — Notion

Parent page **"LIVAL OS"**: `380ceb16-ff1b-8184-9727-ed815af61250`
Notion MCP server prefix: `mcp__62fe3d1f-4755-4586-9755-1d5a66769083__`

| Database | Data source ID (`collection://…`) |
|----------|-----------------------------------|
| LIVAL Tasks | `495dc8ff-f3c2-43cc-a13e-c05a74d06de4` |
| LIVAL Projects | `f50d8fc2-95ee-4443-9f5d-13a4a1c86551` |
| LIVAL Brain Dump | `106cbedb-6315-4c6a-9536-d4c3227ae225` |
| LIVAL Inbox | `127a196a-1230-44fc-a759-bf3ccf5e002c` |
| LIVAL Resources | `23491ee3-22e1-4970-8321-d09d4cbd6bc4` |

All five are seeded with the original prototype's sample data (18 tasks, 8 projects, 14 ideas, 12 inbox, 8 resources).

### Read pattern (important)
This Notion MCP has **no bulk row-query tool**. The app reads each database via:
1. `notion-search` with `data_source_url` → returns row **ids + titles** (workspace_search returns all rows, ≤25).
2. `notion-fetch` per page id (in parallel) → returns full properties as JSON inside a `<properties>{…}</properties>` block, parsed by `parsePageProps()`.

So one load = 5 searches + ~60 parallel page fetches. Fine for these volumes; revisit if any DB exceeds ~25 rows (search caps at 25 — would need pagination).

### Write pattern
- Create: `notion-create-pages` with `parent.data_source_id`
- Update: `notion-update-page` `command:"update_properties"` (e.g. `{Status:"Done This Week"}`)
- Property names are case-sensitive and must match the schema. `Time`/`Progress` are numbers; `Labels` is a JSON-array string; Resources uses `Link` (not `URL`, to avoid the `userDefined:` prefix rule).

### Schema notes
- Tasks: Title, Area(sel), Workspace, Project, Priority(sel), Status(sel), Due(text), Time(num), Labels(multi)
- Projects: Name, Area(sel), Workspace, Progress(num), Health(sel), Time(num), Target(text)
- Brain Dump: Title, Type(sel), Date(text) · Inbox: Subject, From, Tag(sel), Icon, Time · Resources: Title, Link(url), Category(sel), Project, Date
- `Due`/`Target`/`Date` are **text** (e.g. "Today", "Jun 20") to match the prototype's display, not real date pickers.

---

## How to update

1. Edit `/Users/liana/Developer/lival-os.html` (all logic is in the bottom `<script>`).
2. Publish: `mcp__cowork__update_artifact(id="lival-os", html_path="/Users/liana/Developer/lival-os.html", mcp_tools=[notion-search, notion-fetch, notion-create-pages, notion-update-page])`.
3. The artifact runtime exposes `window.cowork.callMcpTool`. Opened as a plain file (no cowork), the app shows "Demo mode" with empty data — that's expected.

Verify before publishing: `node --check` on the extracted script, and confirm `getElementById` targets exist (both passed this build).

---

## Spec Constraints (unchanged, must not violate)
- ❌ No billable labels · ❌ No assignee/owner fields · ❌ No focus timers · ❌ No Gmail/Calendar integration in this gen · ❌ No mobile layout

---

## Known gaps / what's next
- **Due/Target are text, not real dates** — no calendar picker; sorting by due is lexical. Migrating to Notion DATE type is a future step.
- **Wins, Archive, sidebar sparkline, week calendar, weekly outcomes/open-loops** are still **static** (no DB). Momentum score is hardcoded (92).
- **Inbox/Brain Dump "Archive"** buttons are visual only (no delete — Cowork prohibits hard-delete; would need a soft "Archived" flag).
- **Reports → Themes** tab still a placeholder (AI weekly themes).
- **Topbar search** is decorative; **Cmd+K** quick capture not yet added.
- **Read cost:** ~60 page fetches per load. If volumes grow, add a soft cache or pagination. Watch Notion rate limits.
- **Concurrency:** direct edits in Notion while the artifact is open can be overwritten by an in-flight optimistic write; refresh (⟳) reconciles.

---

## ✅ Session update — 2026-06-16: `lival-sync` BUILT

The TASKS.md → Notion bridge below is now built and live.

- **Skill:** `~/Developer/.claude/skills/lival-sync/` (SKILL.md + `scripts/parse_tasks.py`). Installable copy delivered as `lival-sync.skill`.
- **Scheduled:** `lival-sync-daily`, runs **08:00 local daily** (file: `~/Claude/Scheduled/lival-sync-daily/SKILL.md`). On-demand trigger: say "sync LIVAL".
- **First real sync done:** 19 real tasks created in LIVAL Tasks (11 Job Search, 5 Life Admin, 1 Build Lab, 2 Client), all Backlog.

### ⚠️ Reality vs. the original spec (important corrections)
The original spec below assumed `clients/*/TASKS.md` + `personal/*/TASKS.md` with folder→Area/Project. **Those files don't exist.** What's actually synced:

- **Canonical source = `~/Developer/command-center-work-os/TASKS.md`** — the productivity-plugin *master aggregate* list, which already encodes everything inline: `- [ ] **Title** - [area][priority][type] — Area › Project`.
- The old duplicate at `~/Developer/command-center/command-center/TASKS.md` was **deleted** (whole `command-center/` tree removed 2026-06-16) — `command-center-work-os/TASKS.md` is now the sole master, no drift hazard.
- Per-project files (e.g. ETD `codex-site/TASKS.md`, different format) are **not** synced. Adding them = a second parser; discuss first.

### Maintenance guide
Full upkeep doc for the master file (canonical path, duplicate cleanup, format contract, drift rules): **`~/Developer/command-center-work-os/TASKS_MAINTENANCE.md`**.

### Mapping (as built)
`## Backlog/Ready/In Progress/Review-Blocked/Done` → Status `Backlog/This Week/In Progress/Blocked/Done This Week`; `[x]`→Done This Week · `[urgent/normal/someday]`→Priority `High/Medium/Low` · `[job-search]`→Job Search, `[marketing/restaurant/etc]`→Client, `[personal]`→**Life Admin if setup/admin/env else Build Lab** · right of `›`→Project · mappable tags→Labels. Upsert key = **Title+Project** (idempotent; re-runs skip unchanged). **Never deletes.**

### Demo data note
The 18 seeded prototype tasks still sit alongside the 19 real ones (37 total). The Notion MCP exposes no delete/archive tool, so they must be removed manually in Notion (open LIVAL Tasks → multi-select the demo rows → Delete).

---

## ✅ Session update — 2026-06-16: `lival-capture` + `lival-weekly-review` BUILT

Both remaining recommended skills are built. Delivered as installable `.skill`
files (the `~/Developer/.claude/skills/` dir is write-protected in Cowork
sessions, so install via the skill cards / Settings rather than a direct write).

**`lival-capture`** — create-only quick-capture into the right LIVAL Notion DB
from any chat ("add to LIVAL", "capture idea: …"). Routes to Tasks / Brain Dump
(default for loose blurts) / Inbox / Resources / Projects. Thin wrapper over
`notion-create-pages`; never updates or deletes. Has the 5 data-source IDs +
per-DB field defaults baked in.

**`lival-weekly-review`** — computes the rollup the app fakes. Reads LIVAL Tasks,
computes momentum, builds the Win Log, appends a weekly Archive snapshot.
- **Momentum formula (resolves a PRD open question):** simple completion ratio,
  `round(closed / planned * 100)`, where `closed` = Status "Done This Week" and
  `planned` = every task NOT in Backlog (Done This Week + This Week + In Progress
  + Blocked). Backlog excluded. Math lives in `scripts/compute_review.py`
  (deterministic, unit-checked: 3 closed / 6 planned → 50).
- **Two NEW Notion DBs created** under the LIVAL OS parent page for it to write to:

  | New DB | Data source ID |
  |--------|----------------|
  | LIVAL Wins | `3d7ba9e1-fe5f-4cbb-8857-5159e2a292e7` |
  | LIVAL Archive | `1ca2378e-3b01-4edd-a55d-9eeaed6acccc` |

  Wins: `Win`(title), `Week`, `Area`(select, 5 areas), `Date`. Archive: `Week`(title),
  `Tasks Closed`, `Planned`, `Hours`, `Momentum`, `Top Area`, `Notes`, `Date`.
- **Scheduled:** `lival-weekly-review-friday`, runs **Fri 5pm local** (cron
  `0 17 * * 5`, file `~/Claude/Scheduled/lival-weekly-review-friday/SKILL.md`).
  On-demand trigger: "LIVAL weekly review".

### Follow-ups this opens
- ✅ **DONE (2026-06-16): app wired to live data.** `lival-os.html` no longer
  hardcodes momentum 92 or static Wins/Archive. Momentum is now computed live from
  current tasks via the same completion ratio as the skill (`liveMomentum()`:
  done ÷ committed, Backlog excluded) — *not* read back from Archive, since
  "this week" is in-progress while Archive holds historical snapshots. The Win Log
  reads **LIVAL Wins** and Archived Weeks reads **LIVAL Archive** (both via the
  existing `readDS` search+fetch pattern; seeds show only in demo mode / when those
  DBs are empty). Trends chart's "This Week" point uses `liveMomentum()`. Republished
  to the `lival-os` artifact. Reports → "Momentum Score" badge auto-labels
  (Excellent/Solid/Building/Needs a push).
- `Hours` is only as good as `Time` population (no in-app timer per spec). Real
  hours wait on `lival-time-sync`.
- Week-boundary reset (Done This Week → archived/cleared) is still manual; the
  review reports closed tasks but does not reset them (Cowork has no hard-delete).

---

## Next thread — TASKS.md → Notion sync bridge (original spec, now SUPERSEDED by the above)

**Why:** the sandboxed artifact can't read the filesystem. Only Claude-in-a-session (or a local script) can read `~/Developer/*/TASKS.md`. So to track folder tasks while keeping Notion canonical, a file-reading job must upsert files → Notion. The artifact then reflects it on refresh.

**Design (one-way, files → Notion, v1):**
- Scan `clients/*/TASKS.md` and `personal/*/TASKS.md`.
- Parse markdown: `## Section` → **Status** (map: In Progress / This Week / Backlog / Blocked / Done This Week), `- [ ]` / `- [x]` → task + done state. Optional inline `@high` → Priority, `#tag` → Labels.
- Map **folder name → Project**, **top-level folder → Area** (`clients/`→Client, `personal/`→Build Lab; `_services/` likely Home Ops — confirm with Liana).
- Upsert into LIVAL Tasks: match by Title+Project; create if new, update Status if changed. Don't duplicate.
- Run on demand ("sync LIVAL from my projects") and/or as a scheduled task (e.g. daily 8am).
- **First step before coding:** read the real TASKS.md files to confirm their actual format — the parser must match what Liana writes, not an assumed format. (We have NOT yet looked at the real files.)
- Two-way (artifact "Mark Done" → write back to file) is deferred; conflict handling is the hard part.

## New skills to create (recommended)

1. **`lival-sync`** — the bridge above. *Trigger:* "sync LIVAL", "update LIVAL from my projects", or scheduled. Reads project TASKS.md → upserts LIVAL Notion Tasks. The most valuable next skill.
2. **`lival-capture`** — quick-add a task / idea / resource to the right LIVAL Notion DB from any chat. *Trigger:* "add to LIVAL", "capture idea: …". Thin wrapper over `notion-create-pages` with the data-source IDs below.
3. **`lival-weekly-review`** — compute the weekly rollup the app currently fakes: count Done-This-Week, sum Time, derive a real momentum score, generate the Win Log, and append an Archive snapshot. *Trigger:* "LIVAL weekly review", or scheduled Friday PM. (Wins / Archive / momentum score are still hardcoded in the HTML — this skill would make them real, likely by writing to two new Notion DBs: LIVAL Wins, LIVAL Archive.)
4. *(later)* **`lival-time-sync`** — pull session/Claude Code time into task & project `Time`. Depends on settling the time-tracking source (see PRD open questions).

Use `skill-creator` to scaffold these. Each needs the server prefix + data-source IDs from the **Backend — Notion** section above.

---

### Copy-paste prompt for a new chat
> Continuing **LIVAL OS** (Notion-backed personal command center). Source: `/Users/liana/Developer/lival-os.html`, published as the Cowork artifact **`lival-os`** (NOT `daily-command-center`). PRD: `/Users/liana/Developer/LIVAL_OS_PRD.md`. **Read the handoff first: `/Users/liana/Developer/LIVAL_OS_Handoff.md`** — it has the architecture, the 5 Notion data-source IDs, the read/write patterns, and known gaps. Decision is locked: **Notion is the source of truth, artifact stays.**
>
> This session I want to build the **`lival-sync` skill** — the TASKS.md → Notion sync bridge described in the handoff. Start by reading my actual `clients/*/TASKS.md` and `personal/*/TASKS.md` files so the parser matches my real format, propose the folder→Area / section→Status mapping, then build it (and set it up as a daily scheduled task). Use the `skill-creator` skill. After that, if there's time: create the `lival-capture` and `lival-weekly-review` skills too.
