# LIVAL OS — Task Hierarchy & Database Architecture

## Purpose

This document defines the canonical hierarchy for LIVAL OS / Brain OS and explains how that hierarchy maps into the backend database, Google Sheets setup, and dashboard views.

It should be used alongside:

- `LIVAL_OS_Frontend_Artifact_Spec_V4_1.md`
- `LIVAL_OS_Backend_Architecture_Spec_Reconciled.md`
- `LIVAL_OS_Brain_OS_Skills_Hooks_Spec.md`

---

# 1. Core Hierarchy

The core hierarchy is:

```text
Area
 └ Workspace
     └ Project
         └ Task
             └ Subtask
```

## Definitions

### Area

A major life or work domain.

Examples:

- Career
- Client Work
- AI Products
- Home
- Health
- Finances

### Workspace

A focused operating space inside an Area. Workspaces keep large Areas from becoming flat and overwhelming.

Example:

```text
Area: Client Work
 └ Workspace: Marketing Company
```

### Project

A meaningful outcome that can be completed, paused, or archived.

Example:

```text
Project: Blog Automation Workflow
```

### Task

A concrete action that moves a project forward.

Example:

```text
Task: Create Google Sheets approval control table
```

### Subtask

A smaller checklist item inside a task.

Example:

```text
Subtask: Add status dropdown values
```

### Example from LIVAL_OS
Consulting → ETD → Enertia ROI Calculator → Update Pricing Logic → Change Enertia 3 price.

```text
Goal: Automate marketing content workflows

Initiative: Content Automation

Project: Social Publishing Agent

Epic: LinkedIn Integration

Feature: Scheduled Posts

Story: Marketers can approve and schedule posts

Task: Build LinkedIn API connector

Subtasks:
- Obtain API credentials
- Create OAuth flow
- Test draft creation
- Log publishing status
---

# 2. Important Rule: Ideas Are Not Projects

Ideas do not enter the project hierarchy immediately.

They live in Brain Dump until intentionally promoted.

```text
Capture
  ↓
Brain Dump
  ↓
Review
  ↓
Promote?
  ↓
Project
```

This prevents the dashboard from becoming cluttered with uncommitted ideas.

---

# 3. Approval Inbox Rule

Everything enters LIVAL OS through the Approval Inbox first.

```text
Apple Shortcut
Claude Code Hook
Manual Entry
Future Connector
  ↓
Approval Inbox
  ↓
Reviewed by user
  ↓
Converted to Brain Dump, Resource, Project, Task, Calendar Item, or Archive
```

No automation should directly create final tasks or projects unless that setting is explicitly changed later.

---

# 4. Visual Hierarchy Example

```text
Area: AI Products
│
└── Workspace: Brain OS
    │
    └── Project: Dashboard MVP
        │
        ├── Task: Finalize frontend artifact spec
        ├── Task: Build Google Sheets backend
        ├── Task: Create Claude Code hooks
        └── Task: Connect dashboard snapshot
```

---

# 5. Backend Database Design

The backend should be implemented first in Google Sheets.

Google Sheets acts as the source of truth for the MVP because it is easy to inspect, update, connect to Apple Shortcuts, and expose to Claude/Cowork.

Future migration path:

```text
Google Sheets MVP
  ↓
SQLite or Supabase later, if needed
```

---

# 6. Core Relational Model

```text
areas.area_id
  ↓
workspaces.area_id
  ↓
projects.workspace_id
  ↓
tasks.project_id
  ↓
subtasks.task_id
```

Supporting tables:

```text
approval_inbox
brain_dump
resources
time_entries
code_sessions
changed_files
calendar_items
weekly_reviews
activity_log
dashboard_snapshot
```

---

# 7. Google Sheets Workbook Setup

Use one workbook for the Brain OS backend.

Recommended tabs:

```text
00_dashboard_snapshot
01_areas
02_workspaces
03_projects
04_tasks
05_subtasks
06_approval_inbox
07_brain_dump
08_resources
09_time_entries
10_code_sessions
11_changed_files
12_calendar_items
13_weekly_outcomes
14_open_loops
15_focus_areas
16_weekly_reviews
17_archive_snapshots
18_activity_log
19_settings
```

---

# 8. Table Schemas

## 00_dashboard_snapshot

A read-optimized layer for the Cowork live artifact.

Fields:

```text
snapshot_id
created_at
section
metric_name
metric_value
record_type
record_id
payload_json
```

Purpose:

- Keeps the artifact from needing to calculate everything itself
- Makes dashboard refreshes faster and more stable
- Gives Cowork a clean data contract

---

## 01_areas

Fields:

```text
area_id
name
description
status
sort_order
created_at
updated_at
```

---

## 02_workspaces

Fields:

```text
workspace_id
area_id
name
description
status
sort_order
created_at
updated_at
```

---

## 03_projects

Fields:

```text
project_id
workspace_id
project_name
description
status
health
priority
progress_percent
start_date
target_date
created_from_inbox_id
created_at
updated_at
archived_at
```

Allowed `status` values:

```text
Active
Paused
Completed
Archived
```

Allowed `health` values:

```text
On Track
Needs Attention
Blocked
Paused
Completed
Archived
```

---

## 04_tasks

Fields:

```text
task_id
project_id
title
description
board_status
daily_plan_band
priority
labels
due_date
estimated_minutes
created_from_inbox_id
created_at
updated_at
completed_at
archived_at
```

Allowed `board_status` values:

```text
Backlog
This Week
In Progress
Blocked
Done This Week
```

Allowed `daily_plan_band` values:

```text
Must Do
Should Do
Could Do
None
```

Allowed `priority` values:

```text
High
Medium
Low
```

---

## 05_subtasks

Fields:

```text
subtask_id
task_id
title
status
sort_order
created_at
completed_at
```

---

## 06_approval_inbox

Fields:

```text
inbox_id
created_at
source
source_type
sender_or_source_title
subject_or_title
raw_text
suggested_type
suggested_area_id
suggested_workspace_id
suggested_project_id
suggested_task_id
confidence
status
age_label
review_notes
approved_at
converted_to_type
converted_to_id
archived_at
```

Allowed `suggested_type` values:

```text
Email
Appointment
Idea
Resource
Task
Note
```

Allowed `status` values:

```text
New
Needs Review
Approved
Converted
Archived
Rejected
```

---

## 07_brain_dump

Fields:

```text
brain_dump_id
created_at
title
raw_text
type
tags
status
source
review_count
last_reviewed_at
promoted_to_project_id
archived_at
```

Allowed `type` values:

```text
Idea
Thought
Someday/Maybe
Link
```

Allowed `status` values:

```text
Captured
Keep
Promote Candidate
Promoted
Archived
```

---

## 08_resources

Fields:

```text
resource_id
created_at
title
url
source
category
related_area_id
related_workspace_id
related_project_id
notes
status
archived_at
```

---

## 09_time_entries

Fields:

```text
time_entry_id
created_at
entry_date
source
area_id
workspace_id
project_id
task_id
duration_minutes
summary
auto_tracked
code_session_id
notes
```

Allowed `source` values:

```text
Claude Code
Manual
Calendar
Imported
```

---

## 10_code_sessions

Fields:

```text
code_session_id
repo_name
workspace_id
project_id
task_id
started_at
ended_at
duration_minutes
summary
branch_name
commit_hash
status
```

---

## 11_changed_files

Fields:

```text
file_change_id
code_session_id
repo_name
file_path
change_type
lines_added
lines_deleted
timestamp
```

---

## 12_calendar_items

Fields:

```text
calendar_item_id
created_at
source
title
start_datetime
end_datetime
type
area_id
workspace_id
project_id
related_task_id
location
notes
status
```

---

## 13_weekly_outcomes

Fields:

```text
outcome_id
week_start
title
area_id
workspace_id
project_id
rank
status
created_at
```

---

## 14_open_loops

Fields:

```text
open_loop_id
created_at
title
area_id
workspace_id
project_id
status
resolved_at
```

---

## 15_focus_areas

Fields:

```text
focus_area_id
week_start
area_id
workspace_id
project_id
title
rank
status
created_at
```

---

## 16_weekly_reviews

Fields:

```text
review_id
week_start
week_end
tasks_completed
hours_worked
projects_advanced
ideas_captured
weekly_summary
momentum_score
created_at
```

---

## 17_archive_snapshots

Fields:

```text
snapshot_id
week_start
week_end
completed_tasks_json
weekly_win_log_json
hours_worked
projects_advanced
ideas_captured
weekly_summary
momentum_score
created_at
```

---

## 18_activity_log

Fields:

```text
activity_id
timestamp
source
event_type
related_type
related_id
area_id
workspace_id
project_id
task_id
summary
metadata_json
```

---

## 19_settings

Fields:

```text
setting_id
setting_name
setting_value
updated_at
notes
```

---

# 9. Dashboard Mapping

## Command Center

Uses:

```text
00_dashboard_snapshot
04_tasks
06_approval_inbox
09_time_entries
16_weekly_reviews
```

Shows:

- Today’s Top 3
- Inbox Overview
- Weekly Progress
- Time Tracking
- Board Preview
- Quick Stats

---

## Daily Planner

Uses:

```text
04_tasks
06_approval_inbox
12_calendar_items
```

Shows:

- Must Do
- Should Do
- Could Do
- Schedule
- Unplanned inbox items

---

## Weekly Planner

Uses:

```text
13_weekly_outcomes
14_open_loops
15_focus_areas
04_tasks
12_calendar_items
```

Shows:

- Weekly outcomes
- Open loops
- Focus areas
- Weekly task plan

---

## Board

Uses:

```text
04_tasks
03_projects
02_workspaces
01_areas
```

Columns:

```text
Backlog
This Week
In Progress
Blocked
Done This Week
```

---

## Projects

Uses:

```text
03_projects
02_workspaces
01_areas
04_tasks
09_time_entries
```

---

## Project Detail

Uses:

```text
03_projects
04_tasks
08_resources
09_time_entries
10_code_sessions
11_changed_files
18_activity_log
```

---

## Task Detail

Uses:

```text
04_tasks
05_subtasks
09_time_entries
11_changed_files
18_activity_log
```

---

## Inbox

Uses:

```text
06_approval_inbox
```

---

## Brain Dump

Uses:

```text
07_brain_dump
```

---

## Resources

Uses:

```text
08_resources
```

---

## Reports

Uses:

```text
09_time_entries
10_code_sessions
11_changed_files
16_weekly_reviews
18_activity_log
```

---

## Archive

Uses:

```text
17_archive_snapshots
```

---

# 10. Claude Code Project Integration

Each project folder should push activity to the Brain OS backend.

```text
project-folder/
  CLAUDE.md
  .claude/
    rules/
      brain-os-logging-rules.md
    hooks/
      session_start.sh
      post_tool_use.sh
      session_end.sh
```

Each repo logs:

- Session start
- Session end
- Time spent
- Session summary
- Changed files
- Follow-up tasks into Approval Inbox

---

# 11. System Rules

1. The frontend spec is the UI contract.
2. The backend schema must support the frontend exactly.
3. Google Sheets is the source of truth for MVP.
4. Claude Cowork Live Artifact is the dashboard layer, not the database.
5. Every new capture goes to Approval Inbox first.
6. Ideas stay in Brain Dump until promoted.
7. Every automated change creates an Activity Log row.
8. Claude Code logs time, summaries, and changed files.
9. Projects should use push-based logging into Brain OS.
10. Do not add enterprise fields like billable, assignee, owner, or team unless explicitly added later.

---

# 12. Relationship to Other Canonical Docs

This document explains the hierarchy and database architecture.

Use it with:

```text
LIVAL_OS_Frontend_Artifact_Spec_V4_1.md
LIVAL_OS_Backend_Architecture_Spec_Reconciled.md
LIVAL_OS_Brain_OS_Skills_Hooks_Spec.md
```

Together, these documents define:

- Frontend/dashboard contract
- Backend/source-of-truth architecture
- Task hierarchy and database model
- Claude Code/Cowork skills and hooks
