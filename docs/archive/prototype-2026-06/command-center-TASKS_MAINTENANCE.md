# Master TASKS.md — Maintenance Guide

How the master task list is kept healthy and how it flows to the LIVAL board.
Read this before hand-editing the file, moving it, or changing its format.

## What this file is

`TASKS.md` in this folder is the **master aggregate task list** — the one place
tasks are written by hand (or by the productivity `add-task` / `update` skills and
by `lival-scope`). It is the **source of truth** for the LIVAL board: the
`lival-sync` skill reads it daily and upserts every task into the LIVAL Tasks
Notion database, which the `lival-os` Cowork artifact renders.

Pipeline in one line:

```
edit TASKS.md  ──lival-scope (writes)──►  TASKS.md  ──lival-sync (reads)──►  Notion LIVAL Tasks  ──►  lival-os artifact
```

It is **one-way**: file → Notion. Editing a task in the artifact does *not* write
back to this file (deferred — conflict handling is the hard part). So this file
wins. If the board and the file disagree, fix the file and re-sync.

## Canonical file

`~/Developer/command-center-work-os/TASKS.md` is the **single source of truth** —
the only master task list.

> The old duplicate at `~/Developer/command-center/command-center/TASKS.md` has
> been **deleted** (the whole `command-center/` tree was removed on 2026-06-16),
> so the earlier drift hazard is resolved. If a second copy ever reappears, treat
> this `command-center-work-os` file as canonical and remove the other.

## Line format contract

Every task is one line under a section heading:

```
## Backlog
- [ ] **Task title** - [area][priority][type] — Area › Project. optional trailing note
- [x] **A finished task** - [job-search][normal][docs] — Job Search › Application Tracking
```

Pieces, left to right:

- `- [ ]` open / `- [x]` done. A checked box always becomes "Done This Week".
- `**bold**` is the **Title** (also half the upsert key — keep it stable).
- `[tag][tag][tag]` — bracketed tags. Order is by convention `[area][priority][type]`
  but the parser reads them by meaning, not position.
- `—` (em dash, U+2014) separates the tags from the `Area › Project` suffix.
- `›` (U+203A) separates the grouping (left) from the **Project** (right).
- Anything after the project as `". note"` is a human note; it's trimmed off the
  Project before syncing.

These two characters matter: use the real `—` and `›`, not `-` or `>`. `lival-scope`
emits them correctly; if you hand-type a line, copy an existing one.

## How fields map to the LIVAL board

| In the file | LIVAL field | Rule |
|---|---|---|
| `## Backlog / Ready / In Progress / Review/Blocked / Done` | Status | `Backlog / This Week / In Progress / Blocked / Done This Week` |
| `[x]` | Status | forces `Done This Week` (overrides the section) |
| `[urgent] / [normal] / [someday]` | Priority | `High / Medium / Low` |
| `[job-search]` | Area | Job Search |
| `[marketing] [restaurant] [bistro] [etd] [client] [consulting]` | Area | Client |
| `[build-lab]` / `[personal]`+build group | Area | Build Lab |
| `[life-admin]` / `[personal]`+setup/admin/env group | Area | Life Admin |
| `[home-ops]` / `[home]` | Area | Home Ops |
| right of `›` | Project | text; trailing `". note"` trimmed |
| mappable tags | Labels | only real options carry: Job Search, ETD, Bistro, Website, AI, Calculator, Home Ops, Travel, Emergent, Admin |

LIVAL Areas (fixed): Client, Build Lab, Job Search, Life Admin, Home Ops.
LIVAL Statuses (fixed): Backlog, This Week, In Progress, Blocked, Done This Week.

The authoritative logic lives in
`~/Developer/.claude/skills/lival-sync/scripts/parse_tasks.py`. If this table and
the script ever disagree, the script wins — fix the table.

## The two `[personal]` areas

`[personal]` is split by the **grouping** (the text left of `›`):

- grouping mentions environment / setup / admin / config / foundation / workspace /
  infra → **Life Admin**
- otherwise (a real build project) → **Build Lab**

For unambiguous routing, prefer the explicit tags `[build-lab]` / `[life-admin]`
(both round-trip exactly). `[personal]` is kept for your existing hand entries.

## Upsert behavior (why duplicates don't happen)

`lival-sync` matches each parsed task to Notion by **Title + Project**:

- no match → create
- match with changed Status/Priority/Area/Labels → update only those fields
- identical → skip

So re-running is safe and idempotent. The practical consequence: **don't rename a
Title or change its Project casually** — to the sync that's a different task, so it
creates a new row and orphans the old one. Move it between sections (status), tweak
priority/labels freely — those update in place.

## When/how it syncs

- **Daily 08:00 local** via the scheduled task `lival-sync-daily`.
- **On demand** any time: say "sync LIVAL".
- A normal daily run should be small. If a run wants to create/update >~15 rows it
  pauses and reports — that usually means the format drifted or the wrong file was
  read. Investigate before letting it write.

## Keeping it from drifting — do / don't

- **Do** keep all tasks under one of the five known section headings. Tasks above
  any heading, or under an unknown heading, are skipped (the parser warns).
- **Do** read parser warnings when they appear — they pinpoint malformed lines.
- **Do** let `lival-scope` add new project work (it formats lines correctly and
  dedupes).
- **Don't** change `—`/`›` to ASCII look-alikes, or rename Titles/Projects of
  tasks already on the board.
- **Don't** expect artifact edits to flow back here — they don't.

## Related

- Skill (read→Notion): `~/Developer/.claude/skills/lival-sync/`
- Skill (scope→file): `~/Developer/.claude/skills/lival-scope/`
- LIVAL architecture & data-source IDs: `~/Developer/LIVAL_OS_Handoff.md`
