# Workspace — command-center

Instructions for both Cowork and Claude Code working anywhere under `~/Work/`.

## Source of truth
- **`~/Work/command-center/TASKS.md` is the single source of truth for tasks.** Read it before
  acting on "my tasks"; write changes back in the same format. It is shared between Cowork
  (Productivity Plugin + `dashboard.html`) and Claude Code.
- Keep TASKS.md in the exact format the Productivity Plugin parses: `# Tasks` title, one
  `## Column` heading per Kanban column, tasks as `- [ ] **Title** - note`, subtasks as
  two-space-indented `  - [ ] text`. No other markdown between sections — the dashboard drops
  it on save.

## Board
- Columns (left → right): **Backlog → Ready → In Progress → Review/Blocked → Done**.
- TASKS.md stays **flat** — each card is one Task. Epic → Story hierarchy lives in per-project
  `PLAN.md` files; on the board it is carried in the card note as `Epic › Story`.
- WIP is uncapped. Board is private; filter by context/priority for focused views.

## Labels (put in the card note as `[context][priority][type]`)
- **Context:** personal, marketing, restaurant, job-search
- **Priority:** urgent, normal, someday
- **Type:** feature, bug, chore, docs, infra, spike, hotfix

## Conventions
- **Ideas / Someday** go in `IDEAS.md` (table: Idea | Context | Added | Notes) — never on the
  board. Promote to Backlog when an idea becomes real work.
- **Done sweep:** completed tasks stay visible in Done ~2 weeks, then are documented and
  archived to `archive/`.
- **Project close:** generate a full summary to `archive/<project>-close.md`.
- **Memory:** durable context (people, projects, terms, prefs) lives in `memory/`.

## Layout
- `command-center/` — TASKS.md, IDEAS.md, memory/, archive/, this file. **Syncs via Google Drive.**
- `personal/<project>/`, `clients/<repo>/` — actual work.
- **Code repos stay LOCAL + GitHub only. Never place a git repo inside a Drive-synced folder.**
- Google Drive holds client docs, deliverables, resumes. GitHub holds all code.

## Secrets policy
- Secrets live in **per-repo `.env` files, git-ignored, never committed**.
- **Never** put secrets, tokens, keys, or credentials in CLAUDE.md, TASKS.md, IDEAS.md,
  artifacts, memory files, or any shared/synced instruction file.

## Approvals
- Default is **batched** (do the work, then show the result). Before any review-gated work,
  ask "batched or step-by-step?".
- Daily/weekly **read-only** briefings may run unattended.
