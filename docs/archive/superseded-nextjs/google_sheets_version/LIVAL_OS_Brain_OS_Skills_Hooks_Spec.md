# LIVAL OS Brain OS Skills + Hooks Specification

**Version:** v1.0 Reconciled  
**Date:** 2026-06-16  
**Related backend spec:** `LIVAL_OS_Backend_Architecture_Spec_Reconciled.md`  
**Related frontend spec:** `LIVAL_OS_Frontend_Artifact_Spec_V4_1.md`  
**Purpose:** Define the reusable Claude Code/Cowork skills, rules, hooks, and project scaffolding conventions that keep every LIVAL OS project properly specified, registered, logged, and synchronized with the Brain OS backend.

---

## 1. Design Goal

The Brain OS skill and hook system should make every project behave consistently.

When a new project starts, Claude should:

1. Pause before building.
2. Create a project spec.
3. Create a technical architecture.
4. Create an implementation plan.
5. Register the proposed project through the Approval Inbox.
6. Install local project rules.
7. Enable Claude Code session logging.
8. Track time, summaries, and changed files.
9. Never create tasks or projects directly without approval.
10. Keep the LIVAL OS dashboard aligned with the frontend/backend contract.

---

## 2. High-Level Architecture

```text
Global Brain OS Skill Package
  ~/.claude/skills/brain-os-project-system/

        ↓ used by

Any Claude Code Project Repo
  project/
    CLAUDE.md
    .claude/rules/
    .claude/hooks/

        ↓ writes to

LIVAL OS Backend
  Google Sheets workbook

        ↓ read by

Claude Cowork Live Artifact
  LIVAL OS Dashboard
```

Use a push model:

```text
Each project repo pushes activity to Brain OS.
LIVAL OS does not constantly scan every folder.
```

---

## 3. Recommended Folder Structure

## 3.1 Central LIVAL OS Repo

```text
lival-os/
  README.md
  CLAUDE.md

  docs/
    frontend-artifact-spec-v4-1.md
    backend-architecture-spec.md
    brain-os-skills-hooks-spec.md
    data-contract.md
    decision-log.md

  backend/
    schemas/
      google-sheets-schema.md
      sqlite-future-schema.sql
    scripts/
      append_approval_inbox.py
      append_activity_log.py
      log_code_session_start.py
      log_code_session_end.py
      log_changed_files.py
      log_time_entry.py
      promote_inbox_item.py
      refresh_dashboard_snapshot.py
      create_weekly_review.py

  brain_os_skills_hooks/
    SKILL.md
    brain_os_rules.md
    hook_specs.md
    project_registration.md
    inbox_processing.md
    session_logging.md
    dashboard_refresh.md
    weekly_review.md
    templates/
      project-spec-template.md
      technical-architecture-template.md
      implementation-plan-template.md
      decision-log-template.md
      project-claude-md-template.md
      brain-os-logging-rules-template.md
      settings-hooks-template.json

  artifact/
    data-contract.md
    live-artifact-refresh-prompt.md
    mock-data/
      dashboard_snapshot.json
      tasks.json
      projects.json
```

---

## 3.2 Global Claude Skill Install Location

Install the reusable skill globally so it can be used from any project:

```text
~/.claude/skills/brain-os-project-system/
  SKILL.md
  templates/
  scripts/
  references/
```

The central repo should contain the canonical source copy. The installed global skill can be copied or symlinked from:

```text
lival-os/brain_os_skills_hooks/
```

---

## 3.3 Per-Project Repo Structure

Every project created under Brain OS should have:

```text
project-repo/
  README.md
  CLAUDE.md

  docs/
    project-spec.md
    technical-architecture.md
    implementation-plan.md
    decisions.md

  .claude/
    rules/
      project-rules.md
      brain-os-logging-rules.md
      frontend-backend-contract-rules.md
    hooks/
      session_start.sh
      post_tool_use.sh
      stop_summary.sh
    settings.json
```

---

## 4. Skill Inventory

## 4.1 `brain-os-project-system`

Purpose: Master skill that activates whenever the user creates, plans, or scaffolds a new project.

Trigger phrases:

```text
create a new project
start a project
build an app
make a repo
spec this project
set up this project
new client project
new personal project
new automation
```

Responsibilities:

- Enforce spec-first workflow.
- Prevent coding before project approval.
- Create project docs.
- Generate Brain OS registration payload.
- Install project rules and hooks.
- Keep project structure consistent.

---

## 4.2 `new-project-spec`

Purpose: Create a clean project spec before implementation.

Outputs:

```text
docs/project-spec.md
docs/technical-architecture.md
docs/implementation-plan.md
docs/decisions.md
CLAUDE.md
.claude/rules/project-rules.md
```

Required spec sections:

1. Project name
2. Problem statement
3. Intended user
4. Desired outcome
5. MVP scope
6. Out of scope
7. Frontend requirements, if any
8. Backend requirements, if any
9. Data model
10. Integrations/connectors
11. Automation requirements
12. Testing/validation plan
13. Brain OS registration metadata
14. Approval checklist

Rule:

```text
Do not start implementation until the project spec is approved.
```

---

## 4.3 `project-registration`

Purpose: Register a new project with Brain OS without bypassing approval.

Flow:

```text
New project spec generated
  ↓
Create proposed project payload
  ↓
Append to 06_approval_inbox
  ↓
status = New
  ↓
suggested_type = Project
  ↓
User approves later
  ↓
Only then create row in 03_projects
```

Approval Inbox payload fields:

```text
source = Claude Code
source_type = Task or Note
sender_or_source_title = repo_name
subject_or_title = Proposed Project: <project_name>
raw_text = full project registration summary
suggested_classification = Potential Project
suggested_type = Project
status = New
confidence = 0.85
```

---

## 4.4 `inbox-processing`

Purpose: Convert approved inbox items into structured records.

Allowed conversions:

```text
Approval Inbox → Task
Approval Inbox → Project
Approval Inbox → Resource
Approval Inbox → Brain Dump
Approval Inbox → Calendar Item
Approval Inbox → Archive
```

Rules:

- Never convert an item without user approval.
- Preserve original raw text.
- Write `converted_to_type` and `converted_to_id` back to `06_approval_inbox`.
- Write an `activity_log` row.

---

## 4.5 `session-logging`

Purpose: Convert Claude Code activity into backend time and activity records.

Records created/updated:

```text
10_code_sessions
11_changed_files
09_time_entries
19_activity_log
```

Session lifecycle:

```text
SessionStart → create code session row
PostToolUse → log changed files when files mutate
Stop / SessionEnd → summarize, calculate duration, create time entry
```

Rules:

- Track duration automatically.
- Track repo name and branch when available.
- Track changed files as relative paths.
- Summaries should be short and human-readable.
- Any follow-up tasks go to Approval Inbox, not directly to Tasks.

---

## 4.6 `dashboard-refresh`

Purpose: Generate the precomputed dashboard read model.

Reads:

```text
01_areas
02_workspaces
03_projects
04_tasks
06_approval_inbox
07_brain_dump
09_time_entries
12_calendar_items
16_weekly_reviews
17_weekly_win_log
```

Writes:

```text
00_dashboard_snapshot
```

Snapshot sections:

```text
todays_top_3_json
inbox_counts_json
weekly_progress_json
time_tracking_json
board_preview_json
quick_stats_json
sidebar_time_json
```

Rules:

- Today’s Top 3 must contain exactly 3 items when possible.
- Board Preview must use exact frontend columns.
- Quick Stats must match frontend labels.
- Do not add extra Command Center widgets.

---

## 4.7 `weekly-review`

Purpose: Generate the Weekly Accomplishment Report and Archive snapshot.

Reads:

```text
04_tasks
07_brain_dump
09_time_entries
03_projects
19_activity_log
```

Writes:

```text
16_weekly_reviews
17_weekly_win_log
18_archive_snapshots
00_dashboard_snapshot
```

Outputs:

- Tasks Completed
- Hours Worked
- Projects Advanced
- Ideas Captured
- Weekly Win Log
- Weekly Summary
- Momentum Score
- Archive Snapshot

---

## 5. Required Rules Files

## 5.1 `brain_os_rules.md`

Core rules:

```text
1. LIVAL OS is approval-first.
2. Do not create tasks directly from automation.
3. Do not create projects directly from automation.
4. Ideas stay in Brain Dump until promoted.
5. All project work must map to Area → Workspace → Project → Task where possible.
6. If mapping is uncertain, write to Approval Inbox with Needs Review.
7. No billable fields or labels.
8. No assignee, owner, team, or multi-user fields.
9. Preserve raw user text.
10. Append activity logs for automated changes.
```

---

## 5.2 `project-rules.md`

Per-project rules:

```text
This repo is connected to Brain OS.
Before coding, maintain docs/project-spec.md and docs/implementation-plan.md.
When work creates follow-up tasks, write them to Brain OS Approval Inbox.
When files change during Claude Code sessions, log changed files.
At session end, summarize work completed in human-readable language.
Do not alter Brain OS schema without updating the central backend spec.
```

---

## 5.3 `brain-os-logging-rules.md`

Logging rules:

```text
Log session start time.
Log session end time.
Calculate duration in minutes.
Log changed files with relative paths.
Generate one concise session summary.
Create one time entry per completed session.
Create activity log entries for major changes.
Do not include secrets, API keys, or sensitive file contents in logs.
```

---

## 5.4 `frontend-backend-contract-rules.md`

Contract rules:

```text
The frontend contract is LIVAL OS Frontend V4.1.
Do not add frontend concepts that are explicitly out of scope.
Do not add mobile app behavior.
Do not add focus timer requirements.
Do not add billable/non-billable time labels.
Do not add assignee or owner fields.
Board status values must be exactly:
- Backlog
- This Week
- In Progress
- Blocked
- Done This Week
Daily Planner bands must be exactly:
- Must Do
- Should Do
- Could Do
```

---

## 6. Hook Specification

Claude Code hooks should be used for deterministic logging and automation. Judgment-heavy decisions should be handled by skills and approval workflows.

## 6.1 Hook Events

Use these lifecycle moments conceptually:

| Event | Purpose | Brain OS action |
|---|---|---|
| SessionStart | A coding session begins. | Create `10_code_sessions` row. |
| PostToolUse | Claude uses tools that may modify files. | Log file changes to `11_changed_files`. |
| Stop | Claude finishes responding / session work ends. | Generate summary, time entry, activity log. |
| UserPromptSubmit | Optional guardrail. | Remind Claude to use project spec if user asks to build before spec exists. |

---

## 6.2 `session_start.sh`

Purpose:

```text
Create a code session row when Claude Code starts work in a project.
```

Writes:

```text
10_code_sessions
19_activity_log
```

Expected captured metadata:

```text
repo_name
repo_path
branch_name
started_at
code_session_id
```

---

## 6.3 `post_tool_use.sh`

Purpose:

```text
Detect and log changed files after file-mutating tool use.
```

Writes:

```text
11_changed_files
19_activity_log
```

Recommended detection:

```text
git diff --name-status
git diff --numstat
git status --short
```

Rules:

- Log relative paths only.
- Do not log file contents.
- Do not log secrets.
- Avoid duplicate file rows when possible.

---

## 6.4 `stop_summary.sh`

Purpose:

```text
Close the session, summarize work, create time entry, and optionally create follow-up inbox items.
```

Writes:

```text
10_code_sessions
09_time_entries
19_activity_log
06_approval_inbox, optional
```

Summary format:

```text
Worked on <project/repo>. Completed <main work>. Changed <n> files. Follow-ups: <short list or none>.
```

Important:

Follow-up tasks must go to `06_approval_inbox`, not `04_tasks`.

---

## 7. Example `.claude/settings.json` Hook Skeleton

This is a conceptual template. Adjust exact paths and command names during implementation.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/session_start.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/post_tool_use.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/stop_summary.sh"
          }
        ]
      }
    ]
  }
}
```

---

## 8. New Project Workflow

When the user asks to create a new project:

```text
1. Activate brain-os-project-system skill.
2. Ask only essential missing questions.
3. Draft project spec.
4. Draft technical architecture.
5. Draft implementation plan.
6. Create Brain OS registration payload.
7. Add proposed project to Approval Inbox.
8. Scaffold project folder only after approval or explicit user instruction.
9. Install project rules and hooks.
10. Begin implementation only after the project spec is accepted.
```

---

## 9. New Project Spec Template

```md
# Project Spec: <Project Name>

## 1. Purpose

## 2. Problem Being Solved

## 3. Intended User

## 4. Desired Outcome

## 5. MVP Scope

## 6. Out of Scope

## 7. Frontend Requirements

## 8. Backend Requirements

## 9. Data Model

## 10. Integrations and Connectors

## 11. Automation Requirements

## 12. Project Structure

## 13. Testing and Validation

## 14. Brain OS Registration

- Area:
- Workspace:
- Project:
- Suggested priority:
- Suggested target date:
- Approval Inbox ID:

## 15. Approval Checklist

- [ ] Spec reviewed
- [ ] Scope accepted
- [ ] Backend needs accepted
- [ ] Frontend needs accepted
- [ ] Brain OS registration approved
- [ ] Ready to build
```

---

## 10. Brain OS Registration Payload Template

```json
{
  "source": "Claude Code",
  "source_type": "Note",
  "sender_or_source_title": "<repo_name>",
  "subject_or_title": "Proposed Project: <project_name>",
  "raw_text": "<project_summary>",
  "suggested_classification": "Potential Project",
  "suggested_type": "Project",
  "suggested_area_id": "<area_id_or_blank>",
  "suggested_workspace_id": "<workspace_id_or_blank>",
  "suggested_project_id": "",
  "confidence": 0.85,
  "status": "New"
}
```

---

## 11. Session Summary Template

```md
# Claude Code Session Summary

## Repo

## Started

## Ended

## Duration

## Project Mapping

- Area:
- Workspace:
- Project:
- Task:

## Work Completed

## Files Changed

## Follow-Ups for Approval Inbox

## Notes
```

---

## 12. Reconciliation Against Frontend V4.1

## Confirmed Frontend Requirements Supported

| Frontend requirement | Skill/hook support |
|---|---|
| Automatic first | Hooks log sessions and changed files automatically. |
| Minimal manual maintenance | Automations write to Approval Inbox; user approves later. |
| No focus timer dependency | Time comes from Claude Code sessions/manual fallback only. |
| Area → Workspace → Project → Task | Project spec and registration require this mapping. |
| Board statuses | Rules enforce exact board values. |
| Daily Planner bands | Rules enforce Must Do / Should Do / Could Do. |
| Inbox review queue | `inbox-processing` skill owns all conversions. |
| Brain Dump separate from Projects | Rules prevent direct project creation from ideas. |
| Resources page | Resource captures become Approval Inbox items first. |
| Reports / Weekly Win Log | `weekly-review` skill generates review and archive records. |
| Project Detail Activity | Hooks write `activity_log`, `code_sessions`, `changed_files`. |
| Task Detail Time Tracking | Hooks create `time_entries` and task rollups. |
| No billable labels | Rules ban billable fields and labels. |
| No assignee/owner | Rules ban assignee/owner/team fields. |

## Reconciliation Changes Made

1. Added explicit `dashboard-refresh` skill for `00_dashboard_snapshot`.
2. Added strict Board status rule matching frontend labels.
3. Added Daily Planner band rule matching frontend labels.
4. Added `weekly-review` skill for Reports and Archive.
5. Added `project-registration` rule that writes proposed projects to Approval Inbox first.
6. Added `session-logging` behavior for Claude Code time, summaries, and changed files.
7. Added no-secrets rule for changed file logs.
8. Added no-direct-task creation rule for follow-ups.

---

## 13. Implementation Order

Build in this order:

```text
1. Create Google Sheets backend.
2. Create central lival-os repo structure.
3. Add backend scripts as no-op/stub scripts first.
4. Create global brain-os-project-system skill.
5. Create new-project-spec templates.
6. Create per-project hook templates.
7. Test one project repo with session logging.
8. Test Apple Shortcut capture into Approval Inbox.
9. Generate dashboard snapshot from backend.
10. Connect Cowork live artifact to snapshot/data files.
```

---

## 14. Acceptance Criteria

The Brain OS skills/hooks system is successful when:

- Every new project gets a spec before implementation.
- Every proposed project goes through Approval Inbox first.
- Every Claude Code session creates time and summary records.
- Changed files are logged without file contents or secrets.
- Follow-up tasks are proposed in Approval Inbox, not silently created.
- The dashboard can show current time/project/task progress without manual maintenance.
- Frontend V4.1 can be rendered from the backend without adding unsupported fields.

---

## 15. Final Operating Principle

```text
Spec first.
Approval first.
Log automatically.
Summarize calmly.
Promote intentionally.
Never let automation create clutter.
```
