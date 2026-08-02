# LIVAL Tracking Layer — PRD

**Owner:** Liana
**Status:** Phase 1 built & tested (roll-up `rollup.py` + per-title read in `lival-sync`,
verified against the live board 2026-06-16). Phases 2–4 not yet built. Open questions
below still open.
**Date:** 2026-06-16
**Parent architecture:** `LIVAL_OS_PRD.md` (§9 persistence, §11 roadmap "passive time-tracking", §12 conflict handling), `LIVAL_OS_Handoff.md` (lival-sync/lival-scope pipeline)

> This is a component PRD for the cross-tool task-tracking layer of LIVAL OS. It
> extends the existing file→Notion pipeline; it does not change the artifact or the
> Notion schema. Get sign-off before building (Liana's PRD-first rule).

## Problem

Liana works inside many repos under `~/Developer` across **three different agents**
— Claude Cowork, Claude Code, and Codex. Today only the single central master
`command-center-work-os/TASKS.md` flows to the LIVAL board, and it's hand-maintained.
Work done in a project via Claude Code or Codex is invisible to the board unless she
manually mirrors it into that one file. The result is the exact failure LIVAL OS
exists to fix (PRD §2: invisible momentum, dropped loops) — reintroduced at the
tooling layer. She needs work in *any* project, via *any* of the three tools, to be
tracked and reflected on the board **as she goes**, without manual mirroring.

## Success criteria (specific, testable)

1. Each active repo owns a `TASKS.md` that any of the three tools can update in place.
2. A roll-up upserts every repo's tasks into LIVAL Tasks (Notion) with correct
   Project (from folder) and Area, **idempotently** (re-run = 0 dup creates).
3. A commit in a repo — regardless of which tool made it — results in that repo's
   `TASKS.md` reflecting the change without Liana editing it by hand (git-driven).
4. A Claude Code session end updates the repo's `TASKS.md` from the session's work.
5. Codex sessions update `TASKS.md` via `AGENTS.md` instruction (best-effort layer).
6. The daily 8am roll-up catches anything the live triggers missed (safety net).
7. No duplicate or orphaned tasks when the same work is touched by two tools.

## Scope

**In:**
- A per-project `TASKS.md` **format standard** (one spec, carried in every repo).
- **Multi-repo roll-up**: extend `lival-sync` to scan all in-scope repos, derive
  Project (folder) + Area (mapping + per-repo `CLAUDE.md` hint), upsert to Notion,
  tagging `Workspace` with the repo/client short name.
- **git `post-commit` hook + reconciler** (installable per repo): updates that
  repo's `TASKS.md` from commit activity. Tool-agnostic backbone.
- **Claude Code `Stop` hook**: end-of-session `TASKS.md` update + trigger roll-up.
- **Consistency layer**: a shared task-format block injected into each repo's
  `CLAUDE.md` (Cowork/Claude Code) and `AGENTS.md` (Codex).
- Extending the existing daily scheduled roll-up to the multi-repo model.

**Out (explicitly):**
- Time tracking (hours) — separate future `lival-time-sync` (PRD §11 "Later").
- Two-way write-back from the artifact to files (still deferred — PRD §12 conflict).
- Any change to the Notion schema, the `lival-os` artifact, or the five-area model.
- Non-repo areas as repos: **Job Search** and cross-cutting **Life Admin** have no
  git repo — they stay in the central master file, which becomes one more roll-up
  source (see Open Q1).
- Codex deterministic hooks (Codex is instruction-only via AGENTS.md).

## Constraints

- Must not break the working `lival-sync` / `lival-os` artifact or the 19 live tasks.
- Notion MCP has no bulk query and no delete; roll-up reads via search(≤25)+fetch and
  never deletes (Handoff "Read/Write pattern").
- Upsert identity is **Title + Project** — renames create orphans; the design must
  make Project derivation stable (folder name), and warn on collisions.
- Each tool is repo-scoped; nothing should require a tool to write outside its repo
  except the roll-up itself (which runs in Cowork / on schedule / via hook).
- Respect the personal/client boundary (workspace `CLAUDE.md`): never cross-write
  between `clients/` and `personal/`.

## Plan (sequenced — each phase shippable & reversible)

**Phase 0 — Decide (this doc).** Settle the open questions below. No code.

**Phase 1 — Per-project format standard + roll-up (read side).**
Define the per-repo `TASKS.md` spec; extend `lival-sync` into a multi-source
scanner (discover repos → parse each → derive Project/Area/Workspace → dry-run diff
→ upsert). Ship with dry-run-first and the existing >15-row safety pause. This alone
delivers criteria 1, 2, 7 and is testable against current repos without any hooks.

**Phase 2 — git backbone (write side).**
An installable `post-commit` hook + reconciler script. Decide the commit→task
convention (Open Q2). Hook appends/checks-off in the repo's `TASKS.md`. Provide a
one-command installer to drop the hook into a repo. Delivers criteria 3.

**Phase 3 — Claude Code Stop hook + consistency blocks.**
A `Stop` hook in `.claude/settings.json` that runs the session→`TASKS.md` update and
fires the roll-up; the shared `CLAUDE.md`/`AGENTS.md` task-format block for all
three tools. Delivers criteria 4, 5.

**Phase 4 — Wire schedule + verify end-to-end.**
Point the daily 8am job at the multi-repo roll-up; verify a full loop in each tool
(make a change in Cowork, Claude Code, Codex → see it on the board). Delivers 6.

## Open questions (need Liana's answers before Phase 1)

1. **Central master fate.** Keep `command-center-work-os/TASKS.md` as the home for
   Job Search + cross-cutting Life Admin (no repo), rolled up alongside the per-repo
   files? Or migrate everything? (Recommend: keep it as one more source.)
2. **git → task convention.** How should a commit update tasks? Options:
   (a) commit-message tokens (`done: <title>` / `task: <title>`),
   (b) conventional commits + branch = project,
   (c) commits just logged to a per-repo activity list that the reconciler turns
   into task updates on roll-up. (Recommend (a) for done-detection + (c) as fallback.)
3. **Repo scope.** All of `clients/*` + `personal/*`? Include `_services/*`
   (→ Home Ops) and `career-ops`? Exclude anything?
   **Resolved (2026-06-16):** scan `clients/*`, `personal/*`, `_services/*` —
   **one task file per repo, repo-root only (depth-1)**. Nested files are opt-in
   via a `.lival-include` marker. This is the hard no-duplication guarantee: a
   given piece of work lives in exactly one file. `career-ops` is not scanned for
   now.
4. **Area assignment.** Default mapping `clients/*→Client`, `personal/*→Build
   Lab`, `_services/*→Home Ops`, with a per-repo `CLAUDE.md` `area:` override?
5. **Per-project file format.** Reuse the master line format, or a simpler local form
   (folder already gives Project, repo gives Area, so lines can drop the `Area ›`
   suffix)? Simpler is less to maintain but needs the roll-up to inject Area/Project.
   **Resolved (2026-06-16):** support both. `parse_tasks.py` reads the strict
   checkbox format; `parse_project.py` reads a looser `## Section` / `### Project` /
   bullet format. The roll-up injects Area/Project/Workspace from repo location +
   CLAUDE.md `lival-area:` / `lival-project:` hints.

> **Duplication (resolved 2026-06-16):** no work is ever sourced twice. One task
> file per repo (depth-1) + opt-in nesting. ETD is owned by the central master's
> `Client › ETD ›` lines; the nested `codex-site/TASKS.md` is excluded. Revisit
> only if ETD migrates fully to a repo-root file (then strip ETD from the master).
6. **Concurrency.** Two tools editing the same repo's `TASKS.md` near-simultaneously —
   acceptable to rely on git + last-writer-wins per line, or do we need locking?
   (Recommend git + per-line reconcile; revisit only if it bites.)
