# Archive — the June 2026 prototype generation

**Status: dead. Nothing here is active. Do not build from these documents.**

Archived 2026-08-02 from `~/Developer/`, which had no git history, no cloud sync, and no
backup. They are kept here only as a decision record — this directory is the reason those
paths could safely be deleted.

## What this was

A file→Notion→HTML-artifact pipeline that predated the React app in this repo:

    ~/Developer/command-center-work-os/TASKS.md
      → lival-sync skill (rollup.py + parse_tasks.py)
        → 5 Notion databases under the "LIVAL OS" parent page
          → lival-os.html, published as a Cowork artifact

Two skills drove it, `lival-sync` (file → Notion) and `lival-scope` (PRD → tasks appended
to `TASKS.md`). Both were deleted along with the source files.

## Why it was retired

The direction was backwards. Notion was a *mirror* of a markdown file, which meant two
sources of truth and a one-way bridge that could only ever drift. The current architecture
inverts it: Notion is a phone-first **capture source** feeding `ingest-quick-capture`, and
Supabase is the only system of record. See the root `PRD.md`.

## Contents

| File | What it is |
|---|---|
| `command-center-TASKS.md` | The master task list. 75 tasks — 2 In Progress, 53 Backlog, 20 Done. Roughly 28 were real live work (Job Search, ETD, Bistro, Emergent); the rest were unstarted Build Lab ideas and LIVAL self-maintenance. |
| `command-center-TASKS_MAINTENANCE.md` | The line-format contract (`- [ ] **Title** - [area][priority][type] — Area › Project`, literal U+2014 and U+203A) and the field-mapping table into Notion. |
| `command-center-CLAUDE.md` | Workspace instructions for the old board — columns, labels, conventions. |
| `command-center-IDEAS.md` | Empty stub. Kept for completeness. |
| `LIVAL_OS_PRD_v1.md` | The original full product PRD. **Contains US1–US14 user stories, risks R1–R4, open questions Q1–Q5, and hard NFRs (WCAG AA, <100ms transitions) that exist in no other document.** Harvest before assuming it is redundant. |
| `LIVAL_OS_PRD.md` | The Notion-generation PRD. Five areas, no Workspace level — conflicts with the six-area model used everywhere else. Its §9 records why Notion beat Google Sheets (the Drive connector cannot write back at cell level). |
| `LIVAL_Tracking_Layer_PRD.md` | **Entirely unique.** The multi-repo task-ingestion design: per-repo `TASKS.md` standard, roll-up, git post-commit hook, Claude Code Stop hook. Phase 1 built, Phases 2–4 never were. |
| `LIVAL_OS_Handoff.md` | Build-state handoff. Notion database IDs, read/write patterns, and the **Momentum Score formula** (`round(closed / planned * 100)`, Backlog excluded) — which this app stores as a field but has never computed. |
| `lival-os.html` | The v5 prototype UI, 97KB, single file, Notion-backed. Superseded by `src/`. |

## Still live elsewhere

The five Notion databases were **not** deleted. One survives as the capture inbox; the other
four are dormant mirrors pending teardown. The published Cowork artifact named `lival-os` was
also left in place.
