# LIVAL OS User Guide: Creating Projects, Tasks, Brain Dump Items, and Resources

**Version:** v1.0  
**Date:** 2026-06-16  
**Related docs:**
- `LIVAL_OS_Frontend_Artifact_Spec_V4_1.md`
- `LIVAL_OS_Task_Hierarchy_Database_Architecture.md`
- `LIVAL_OS_Backend_Architecture_Spec_Reconciled.md`
- `LIVAL_OS_Brain_OS_Skills_Hooks_Spec.md`

## 1. Purpose

This guide explains how a user starts new projects, adds new tasks, captures ideas, saves resources, and approves suggested updates in LIVAL OS.

The goal is simple:

```text
Capture everything quickly.
Review it calmly.
Only promote it when you approve it.
```

LIVAL OS is intentionally approval-first. New information should not silently become an active project or task unless the user explicitly approves it.

---

## 2. Core Rule

Everything enters through the Approval Inbox first.

```text
Capture / Suggestion / Import
        ↓
Approval Inbox
        ↓
User reviews
        ↓
Converted into one of:
- Project
- Task
- Brain Dump item
- Resource
- Calendar item
- Archive
```

This applies to:

- Items captured from the Apple Shortcut
- Items created from the dashboard
- Items suggested by Claude Cowork
- Items suggested by Claude Code
- Items captured from future Gmail, Calendar, Drive, or connector flows

---

## 3. Main User Paths

Users can add information to LIVAL OS in four main ways.

```text
1. Apple Shortcut
2. Dashboard / Live Artifact
3. Claude Cowork conversation
4. Claude Code project work
```

Each path writes to the Approval Inbox first.

---

# 4. Creating a New Project

## 4.1 When a user should create a project

A project should be created when there is a defined outcome that requires multiple steps.

Examples:

```text
Build a dashboard
Set up a client workflow
Create a portfolio project
Plan a website launch
Implement a Claude Code integration
```

A project is not just a random idea. Random ideas belong in Brain Dump until promoted.

---

## 4.2 User flow: new project from dashboard

```text
User clicks "+ New Project"
        ↓
User enters a short project idea
        ↓
System creates Approval Inbox item
        ↓
Claude suggests:
  - Area
  - Workspace
  - Project name
  - Goal / outcome
  - Suggested first tasks
        ↓
User approves or edits
        ↓
Project row is created
        ↓
Suggested tasks are added only if approved
```

Backend records touched:

```text
approval_inbox
projects
tasks, if approved
activity_log
```

---

## 4.3 User flow: new project from Claude Cowork

The user may say something like:

```text
I want to start a new project to build a personal trainer agent.
```

Claude Cowork should not immediately create the project.

Instead, it should:

```text
1. Draft a project spec.
2. Suggest Area and Workspace placement.
3. Suggest initial project tasks.
4. Send the project proposal to Approval Inbox.
5. Wait for user approval before adding it as an active project.
```

If the user says the project is only an idea, it should go to Brain Dump instead.

---

## 4.4 User flow: new project from Claude Code

When a user starts a new repo or asks Claude Code to build something, the Brain OS project spec skill should run.

Claude Code should:

```text
1. Pause before implementation.
2. Create a project spec.
3. Create a technical architecture.
4. Create an implementation plan.
5. Create Brain OS registration metadata.
6. Add a proposed project record to Approval Inbox.
7. Wait for approval before treating it as an active Brain OS project.
```

After approval, the project repo may receive:

```text
CLAUDE.md
.claude/rules/project-rules.md
.claude/rules/brain-os-logging-rules.md
.claude/hooks/session_start.sh
.claude/hooks/post_tool_use.sh
.claude/hooks/stop_summary.sh
```

---

# 5. Creating a New Task

## 5.1 When a user should create a task

A task should be a concrete action.

Good examples:

```text
Update pricing logic
Email client about approval
Draft backend architecture spec
Test Apple Shortcut capture
Create Google Sheet tabs
```

Poor examples:

```text
Think about business
Maybe automate something
Figure out life
```

Those should usually go to Brain Dump or Approval Inbox as notes first.

---

## 5.2 User flow: new task from dashboard

```text
User clicks "+ New Task"
        ↓
User enters task text
        ↓
System creates Approval Inbox item
        ↓
Claude suggests:
  - Related Area
  - Related Workspace
  - Related Project
  - Priority
  - Board status
  - Daily plan band, if relevant
        ↓
User approves or edits
        ↓
Task row is created
```

Backend records touched:

```text
approval_inbox
tasks
activity_log
```

---

## 5.3 User flow: new task from Apple Shortcut

The Apple Shortcut should allow quick capture without forcing organization in the moment.

Shortcut options:

```text
Brain Dump
New Task
Save Resource
Voice Capture
```

Even when the user taps `New Task`, the item still goes to Approval Inbox first.

```text
Apple Shortcut
        ↓
Approval Inbox item
        ↓
User reviews later
        ↓
Task is created only after approval
```

Suggested Approval Inbox fields:

```text
source = Apple Shortcut
suggested_type = Task
status = New
raw_text = user capture
created_at = timestamp
```

---

## 5.4 User flow: follow-up task from Claude Code

At the end of a coding session, Claude Code may suggest follow-up tasks.

Example:

```text
Suggested follow-up:
- Add tests for Google Sheets sync
- Document hook installation
- Fix dashboard snapshot refresh script
```

These do not become active tasks automatically.

They should be added to the Approval Inbox as suggested tasks.

```text
Claude Code session ends
        ↓
Session summary created
        ↓
Suggested follow-up tasks generated
        ↓
Approval Inbox items created
        ↓
User approves later
```

---

# 6. Capturing Brain Dump Items

## 6.1 What belongs in Brain Dump

Brain Dump is for ideas, thoughts, someday/maybe items, and things that should not become projects yet.

Examples:

```text
Build an AI travel deal monitor
Create a local home assistant agent
Maybe turn this into a client service
Look into a better dashboard layout
```

Brain Dump prevents the system from turning every idea into an active commitment.

---

## 6.2 Brain Dump flow

```text
Capture idea
        ↓
Approval Inbox
        ↓
User approves as Brain Dump item
        ↓
Brain Dump
        ↓
Weekly Review
        ↓
Keep, archive, or promote
```

Ideas stay in Brain Dump until explicitly promoted to Project.

---

## 6.3 Promoting Brain Dump to Project

During review, the system may suggest:

```text
This idea has appeared multiple times. Promote it to a project?
```

If the user approves:

```text
Brain Dump item
        ↓
Project proposal
        ↓
Approval Inbox
        ↓
Approved project
```

Backend records touched:

```text
brain_dump
approval_inbox
projects
activity_log
```

---

# 7. Saving Resources

## 7.1 What counts as a resource

A resource is a link, document, file, article, video, reference, prompt, or note that may be useful later.

Examples:

```text
GitHub repo
Claude documentation
YouTube tutorial
Google Doc
PDF
Prompt template
Blog post
```

---

## 7.2 Resource flow

```text
User saves link or file
        ↓
Approval Inbox
        ↓
Claude suggests category and related project
        ↓
User approves
        ↓
Resource is saved
```

Backend records touched:

```text
approval_inbox
resources
activity_log
```

---

# 8. Approval Inbox Behavior

## 8.1 What the Approval Inbox shows

The Approval Inbox should show items waiting for review.

Each item should include:

```text
Title or subject
Source
Suggested type
Suggested Area / Workspace / Project
Confidence
Age
Raw text
Recommended action
```

Possible recommended actions:

```text
Convert to Task
Convert to Project
Send to Brain Dump
Save as Resource
Create Calendar Item
Archive
Reject
```

---

## 8.2 Approval Inbox statuses

```text
New
Needs Review
Approved
Converted
Archived
Rejected
```

---

## 8.3 What happens when the user approves

When the user approves an item:

```text
1. The target record is created or updated.
2. The Approval Inbox item is marked Converted.
3. The converted_to_type field is populated.
4. The converted_to_id field is populated.
5. An activity_log event is created.
```

---

# 9. Task and Project Placement

## 9.1 Hierarchy

LIVAL OS uses this simplified hierarchy:

```text
Area
└── Workspace
    └── Project
        └── Task
            └── Subtask
```

## 9.2 Placement rules

A task should belong to a project.

A project should belong to a workspace.

A workspace should belong to an area.

If Claude is uncertain where something belongs, it should keep the item in Approval Inbox with:

```text
status = Needs Review
```

It should not guess silently.

---

# 10. How Time Tracking Relates to New Tasks and Projects

When a task or project is created manually, it does not automatically have time tracked.

Time is created from:

```text
Claude Code sessions
Manual time entries
Calendar imports, later
Future connector/import flows
```

For Claude Code work:

```text
Session starts
        ↓
code_sessions row created
        ↓
Files change
        ↓
changed_files rows created
        ↓
Session ends
        ↓
summary generated
        ↓
time_entries row created
        ↓
activity_log updated
```

If the coding session is not linked to an existing project, the session should go to Approval Inbox for review.

---

# 11. What Updates Automatically

The following can update automatically:

```text
Code session start time
Code session end time
Duration minutes
Changed files
Session summary
Activity log
Suggested follow-up tasks
Dashboard snapshot refresh
```

The following should not happen automatically in v1:

```text
Creating active projects without approval
Creating active tasks without approval
Deleting records
Promoting Brain Dump ideas to projects
Archiving important records silently
Changing project hierarchy silently
```

---

# 12. Frontend Mapping

## Command Center

Shows:

```text
Today’s priorities
Inbox overview
Active projects
Recent work
Weekly progress
Time tracking summary
```

Sources:

```text
dashboard_snapshot
approval_inbox
tasks
projects
time_entries
code_sessions
weekly_reviews
```

## Inbox

Shows:

```text
All new and needs-review items
```

Source:

```text
approval_inbox
```

## Brain Dump

Shows:

```text
Captured ideas and thoughts
Promotion candidates
Archived ideas
```

Source:

```text
brain_dump
```

## Board

Shows:

```text
Backlog
This Week
In Progress
Blocked
Done This Week
```

Source:

```text
tasks.board_status
```

## Project Detail

Shows:

```text
Project metadata
Related tasks
Related resources
Related time
Recent activity
Changed files
```

Sources:

```text
projects
tasks
resources
time_entries
activity_log
changed_files
```

---

# 13. Example: Starting a New Project

User says:

```text
I want to create a project for a client blog automation workflow.
```

Claude responds by creating a proposed spec, not by immediately creating the project.

Approval Inbox item:

```text
suggested_type: Project
raw_text: Create a project for a client blog automation workflow
suggested_area: Client Work
suggested_workspace: Client Workspace
suggested_project_name: Blog Automation Workflow
status: New
```

After approval:

```text
projects row is created
activity_log row is created
optional approved tasks are created
```

---

# 14. Example: Adding a Task from Apple Shortcut

User captures:

```text
Test the save resource shortcut from Instagram.
```

Approval Inbox item:

```text
source: Apple Shortcut
suggested_type: Task
raw_text: Test the save resource shortcut from Instagram
status: New
```

After approval:

```text
tasks row is created
approval_inbox marked Converted
activity_log row is created
```

---

# 15. Example: Brain Dump Promotion

User captures:

```text
Maybe build a travel points deal monitor.
```

It becomes:

```text
Approval Inbox → Brain Dump
```

Later, during review:

```text
Promote to Project?
```

If approved:

```text
Brain Dump item marked Promoted
Project proposal created
Project created after approval
```

---

# 16. User Responsibility

The user is responsible for:

```text
Reviewing Approval Inbox
Approving or rejecting conversions
Promoting Brain Dump ideas
Correcting suggested Area / Workspace / Project placement
Deciding what becomes active work
```

The system is responsible for:

```text
Capturing quickly
Suggesting structure
Logging activity
Tracking coding time
Summarizing work
Keeping the dashboard updated
Reducing manual organization
```

---

# 17. Final Rule

LIVAL OS should help the user move from messy capture to calm execution.

It should never punish the user for capturing too much.

That is why the system uses:

```text
Fast capture
Approval Inbox
Brain Dump
Explicit promotion
Automatic logging
Dashboard visibility
```
