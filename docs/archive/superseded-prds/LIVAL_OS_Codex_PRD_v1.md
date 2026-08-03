# LIVAL OS - Codex Product Requirements Document

**Product:** LIVAL OS - Personal Operating System  
**Version:** Codex PRD v1.0  
**Owner:** Liana  
**Date:** June 16, 2026  
**Status:** Draft - ready for Codex web app implementation  
**Primary Build Target:** Private personal web app with free-tier deployment and persistence

---

## 1. Summary

LIVAL OS is a private, ADHD-friendly personal operating system for managing consulting work, personal build projects, job search tasks, life admin, resources, time visibility, and weekly accomplishment evidence in one calm web app.

This PRD reframes the original Claude live artifact concept into a Codex-buildable personal web application. The first version should be useful immediately with manual entry, private login, persistent data, responsive desktop/mobile access, and a clean architecture for later automations.

The core principle is automation-ready, not automation-dependent. The app must work on day one without Gmail routing, Siri Shortcuts, or automatic Codex/Claude Code time tracking. Those automations should plug into stable data models and capture endpoints after the manual persistent MVP is working.

---

## 2. Problem Statement

The user is a solo AI automation consultant with ADHD who is simultaneously managing:

- Active consulting clients and client deliverables
- Personal AI build projects
- Job search activity
- Appointments, finances, travel, and life admin
- Learning, resources, ideas, and future project concepts

Existing productivity tools have failed because they require too much upkeep. LIVAL OS should reduce planning overhead, preserve ideas, show real progress, and provide enough structure to feel in control without becoming another maintenance burden.

Success means the user can open the app in the morning and see, without hunting:

- Today's top three priorities
- What needs review
- What is blocked
- How much time has been tracked this week
- Which projects are active or slipping
- What was accomplished recently

---

## 3. Product Goals

### Goals

- **G1. Fast daily orientation:** Help the user decide what to work on in under 60 seconds.
- **G2. Persistent source of truth:** Store tasks, projects, resources, inbox items, brain dumps, and time entries in a real backend.
- **G3. Low-friction capture:** Make adding a task, idea, resource, or time entry quick from desktop and mobile web.
- **G4. Calm project visibility:** Show consulting, build, job search, home, and life admin work in one navigable system.
- **G5. Weekly evidence:** Generate a weekly accomplishment view from real stored activity.
- **G6. Automation-ready foundation:** Provide stable data models and future endpoints for Gmail, n8n, Siri/Shortcuts, and Codex/Claude Code time capture.

### Non-Goals

- Not a multi-user team project management tool.
- Not a public SaaS product.
- Not a paid-service-dependent build.
- Not an invoicing or billing platform.
- Not a native iOS app in v1.
- Not dependent on automations to be useful.
- Not a full replacement for Gmail, Calendar, or file storage.
- Not a Pomodoro or focus timer.

---

## 4. Target User

**Primary persona:** Liana, a solo AI consultant and builder.

The app should support someone who is technically advanced but does not want to spend executive-function bandwidth maintaining a complex productivity system. The interface should feel like a quiet command center: dense enough to be useful, restrained enough to avoid overwhelm.

Design choices should prioritize:

- Fast scanning
- Clear hierarchy
- Minimal required fields
- Keyboard accessibility
- Mobile capture
- Visible momentum
- Manual correction when automations are wrong

---

## 5. MVP Scope

The first Codex build is a private, persistent web app with manual workflows and realistic dashboard calculations.

### Required MVP Capabilities

- Private authentication for one user.
- Persistent CRUD for:
  - Areas
  - Workspaces
  - Projects
  - Tasks
  - Time entries
  - Inbox items
  - Brain dumps
  - Resources
  - Weekly snapshots
  - Activity events
- Dashboard cards computed from stored data.
- Board view with task status columns.
- Project detail views with progress, task, time, resource, note, and activity sections.
- Reports view with weekly accomplishment evidence.
- Responsive mobile web experience focused on Command Center, capture, board, projects, inbox, and settings.
- Export-friendly data shape for future backup or reporting.

### Deferred Capabilities

- Gmail auto-routing.
- Siri Shortcut capture.
- Browser extension/share sheet.
- Automatic Codex/Claude Code time attribution.
- n8n ingestion workflows.
- Native mobile app.
- Multi-account collaboration.
- Billing exports.
- Drag-and-drop persistence, unless it is easy to add after the board data model is stable.

---

## 6. Information Architecture

LIVAL OS uses a four-level work hierarchy:

```text
Area -> Workspace -> Project -> Task
```

| Level | Definition | Examples |
|---|---|---|
| Area | Top-level life domain | Consulting, Build Lab, Job Search, Life Admin, Home Ops, Learning |
| Workspace | Client, sub-domain, or major initiative | ETD, Bistro, Emergent, Auto Job Apply Agent, Health |
| Project | Bounded body of work with a goal and target date | Enertia ROI Calculator, Website Update, MVP Architecture |
| Task | Discrete action item | Update pricing logic, Apply to 5 roles, Schedule dentist |

Tasks may sit under a project or directly under a workspace for one-off work.

---

## 7. Application Views

### 7.1 Command Center

Primary landing screen. Must match the intent of the supplied wireframe.

Required sections:

- Today's Top 3
- Inbox Overview
- Weekly Progress
- Time Tracking This Week
- Board Preview
- Quick Stats
- Sidebar Quick Capture
- Weekly time mini-card

Desktop should show a broad command-center layout. Mobile should condense into stacked cards with bottom navigation.

### 7.2 Daily Planner

Required sections:

- Today's Focus grouped by Must Do, Should Do, Could Do
- Schedule and deadlines
- Unplanned inbox items
- Auto-plan placeholder action

### 7.3 Weekly Planner

Required sections:

- This Week's Outcomes
- Project priorities
- Focus areas
- Open loops
- Weekly calendar overview

### 7.4 Board

Kanban board for all active tasks.

Required statuses:

- Backlog
- This Week
- In Progress
- Blocked
- Done

Required filters:

- Area
- Workspace/client
- Project
- Label
- Priority
- Status
- Due date

### 7.5 Projects

Portfolio view grouped by area. Each project should show:

- Name
- Workspace/client
- Status/health
- Progress
- Target date
- Active task count
- Time tracked this week

### 7.6 Project Detail

Project-level page with tabs:

- Overview
- Tasks
- Timeline
- Time
- Resources
- Notes
- Activity

### 7.7 Task Detail

Task detail drawer or page with tabs:

- Details
- Subtasks
- Files/links
- Notes
- Activity

### 7.8 Inbox

Review queue for captured or automated items.

Tabs:

- All
- Emails
- Appointments
- Ideas
- Resources

Actions:

- Convert to task
- Convert to project
- Save as resource
- Archive
- Mark reviewed

### 7.9 Brain Dump

Low-pressure capture space for ideas and thoughts.

Tabs:

- All
- Ideas
- Thoughts
- Someday/maybe
- Links

### 7.10 Resources

Categorized link and reference library.

Default categories:

- AI / Codex / Claude
- Databricks
- Job Search
- Home Assistant
- Consulting
- Travel
- Marketing
- Finance
- Other

### 7.11 Reports

Weekly accomplishment report.

Required sections:

- Tasks completed
- Hours worked
- Projects advanced
- Ideas captured
- Time allocation
- Project investment
- Weekly Win Log
- Weekly summary
- Momentum Score

### 7.12 Archive

Completed weekly snapshots and historical reports.

---

## 8. Data Model

Use Supabase Postgres as the source of truth. All tables must include `id`, `user_id`, `created_at`, and `updated_at` unless noted otherwise. All user-owned rows must be protected by Row Level Security.

### profiles

Stores single-user profile and app preferences.

Key fields:

- `id`
- `email`
- `display_name`
- `avatar_url`
- `timezone`
- `week_starts_on`
- `created_at`
- `updated_at`

### areas

Top-level domains.

Key fields:

- `id`
- `user_id`
- `name`
- `description`
- `color`
- `sort_order`
- `archived_at`

### workspaces

Clients, domains, or major initiatives inside areas.

Key fields:

- `id`
- `user_id`
- `area_id`
- `name`
- `description`
- `color`
- `sort_order`
- `archived_at`

### projects

Bounded bodies of work.

Key fields:

- `id`
- `user_id`
- `area_id`
- `workspace_id`
- `name`
- `description`
- `goal`
- `status`
- `health`
- `priority`
- `progress_percent`
- `start_date`
- `target_date`
- `completed_at`
- `archived_at`

Allowed project status values:

- planned
- active
- paused
- blocked
- completed
- archived

Allowed health values:

- on_track
- attention
- at_risk
- blocked

### tasks

Discrete action items.

Key fields:

- `id`
- `user_id`
- `area_id`
- `workspace_id`
- `project_id`
- `parent_task_id`
- `title`
- `description`
- `status`
- `priority`
- `due_date`
- `scheduled_for`
- `completed_at`
- `estimated_minutes`
- `sort_order`
- `labels`
- `source`
- `archived_at`

Allowed status values:

- backlog
- this_week
- in_progress
- blocked
- done

Allowed priority values:

- high
- medium
- low

### time_entries

Manual time tracking in v1, automation target later.

Key fields:

- `id`
- `user_id`
- `area_id`
- `workspace_id`
- `project_id`
- `task_id`
- `started_at`
- `ended_at`
- `duration_minutes`
- `description`
- `source`
- `external_ref`

Allowed source values:

- manual
- codex
- claude_code
- shortcut
- imported

### inbox_items

Review queue for manual or automated captures.

Key fields:

- `id`
- `user_id`
- `type`
- `title`
- `body`
- `source`
- `source_url`
- `suggested_area_id`
- `suggested_workspace_id`
- `suggested_project_id`
- `suggested_task_id`
- `confidence`
- `status`
- `received_at`
- `reviewed_at`

Allowed type values:

- email
- appointment
- idea
- resource
- note
- task
- other

Allowed status values:

- new
- reviewed
- converted
- archived

### brain_dumps

Raw thoughts, ideas, and someday items.

Key fields:

- `id`
- `user_id`
- `title`
- `body`
- `category`
- `status`
- `source`
- `converted_task_id`
- `converted_project_id`

Allowed category values:

- idea
- thought
- someday
- link
- other

Allowed status values:

- captured
- reviewed
- converted
- archived

### resources

Links and reference materials.

Key fields:

- `id`
- `user_id`
- `area_id`
- `workspace_id`
- `project_id`
- `title`
- `url`
- `description`
- `category`
- `tags`
- `source`
- `archived_at`

### weekly_snapshots

Archived weekly report state.

Key fields:

- `id`
- `user_id`
- `week_start`
- `week_end`
- `summary`
- `momentum_score`
- `tasks_completed`
- `hours_tracked`
- `projects_advanced`
- `ideas_captured`
- `snapshot_json`

### activity_events

Append-only activity log for recent activity and report generation.

Key fields:

- `id`
- `user_id`
- `entity_type`
- `entity_id`
- `event_type`
- `message`
- `metadata`
- `created_at`

---

## 9. UX and Visual Requirements

The app should follow the supplied wireframe's command-center structure and calm visual language.

### Visual Direction

- Light app canvas: near-white or very light blue-gray.
- Dark navy sidebar.
- Purple primary accent for active states and primary actions.
- Green for healthy, complete, or on-track.
- Yellow/orange for medium priority or attention.
- Red for high priority, blocked, or urgent.
- Blue for informational resources and time.
- Subtle borders, restrained shadows, and compact cards.
- Cards should be functional containers, not decorative clutter.

### Interaction Requirements

- Sidebar navigation on desktop.
- Bottom navigation or compact nav on mobile.
- Quick Capture accessible globally.
- Filters should not reset unexpectedly when navigating within related views.
- Tables, cards, and board columns must have stable dimensions and avoid layout shift.
- Forms should require only the minimum fields needed to save.
- Empty states should offer one clear action, not a wall of instructions.

### Accessibility Requirements

- Keyboard navigable controls.
- Visible focus states.
- Sufficient color contrast for core text and controls.
- Semantic headings and landmarks.
- Respect `prefers-reduced-motion`.
- Do not rely on color alone for priority or status.

---

## 10. Technical Architecture

### Recommended Stack

Use a free, common, Codex-friendly web stack:

- **Framework:** Next.js with TypeScript
- **Styling:** Tailwind CSS
- **UI primitives:** Radix UI or shadcn/ui-compatible primitives
- **Icons:** lucide-react
- **Charts:** Recharts
- **Backend/data:** Supabase free tier
- **Auth:** Supabase Auth with email/password or magic link
- **Hosting:** Vercel free tier
- **Validation:** Zod
- **Forms:** React Hook Form
- **Package manager:** npm unless the generated project chooses pnpm consistently

Next.js is preferred over a static artifact because private routes, auth callbacks, server actions/API routes, and Vercel deployment are all first-class.

### Environment Variables

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional future variables:

- `SUPABASE_SERVICE_ROLE_KEY` for server-only automation endpoints
- `CAPTURE_WEBHOOK_SECRET` for authenticated external capture
- `N8N_WEBHOOK_SECRET` for n8n ingestion

The app must never expose service-role secrets to client code.

### Privacy and Security

- Require login for all app routes.
- Enable Supabase Row Level Security on all user-owned tables.
- Every user-owned query must filter by authenticated user.
- No third-party telemetry by default.
- No paid analytics, tracking pixels, or ad services.
- Future external capture endpoints must require a secret or signed token.

---

## 11. Core Workflows

### Morning Command Center

1. User opens the app.
2. App loads today's Top 3, inbox count, weekly progress, time summary, board preview, and quick stats.
3. User reviews what changed overnight.
4. User opens Daily Planner or starts from a top task.

### Quick Capture

1. User clicks global Add Task, Brain Dump, Add Resource, or Log Time.
2. Modal opens with minimal required fields.
3. User saves.
4. Item appears immediately in the appropriate list.
5. Activity event is recorded.

### Task Planning

1. User creates or edits tasks.
2. User assigns status, priority, due date, area/workspace/project as needed.
3. Board, Command Center, and Reports update from the same task records.

### Time Logging

1. User manually logs time against a project or task.
2. Time appears in Command Center, Project Detail, Task Detail, and Reports.
3. Future automated entries use the same `time_entries` table with a non-manual source.

### Weekly Review

1. User opens Reports.
2. App calculates weekly completed tasks, hours, project movement, ideas captured, and momentum score.
3. User can save a weekly snapshot to Archive.

---

## 12. Automation Roadmap

### Phase 1 - Manual Persistent Web App

- Build private authenticated app.
- Create Supabase schema and RLS policies.
- Implement CRUD and dashboard calculations.
- Deploy on Vercel free tier.
- Verify desktop and mobile responsive flows.

### Phase 2 - Capture Endpoints and Inbox Automation

- Add authenticated capture API endpoints.
- Allow external systems to create inbox items, brain dumps, resources, tasks, and time entries.
- Add confidence/status fields for routed items.
- Add source metadata for traceability.

### Phase 3 - Codex/Claude Code Time Attribution

- Add a local script or CLI-friendly endpoint for logging coding sessions.
- Map local repo paths to projects/workspaces.
- Allow manual correction of misattributed entries.
- Surface unusual time allocations in weekly review.

### Phase 4 - Gmail, Siri/Shortcuts, and n8n

- Gmail or n8n workflow creates inbox items for client emails and appointments.
- Siri Shortcuts create brain dumps and resources through capture endpoints.
- Browser/share workflows save resources.
- Weekly review automation drafts summary text from stored data.

---

## 13. Success Metrics

### Usage

- App opened at least 5 days per week.
- Daily Planner viewed at least once per workday.
- Weekly Report reviewed at least once per week.

### Capture

- At least 80 percent of new ideas are captured in Brain Dump or Inbox.
- Inbox review queue stays under 20 active items.
- Quick Capture remains usable from mobile in under 10 seconds.

### Planning

- User can identify today's top three priorities in under 60 seconds.
- Backlog task age trends downward over time.
- Blocked tasks are visible without needing to search.

### Time and Progress

- Weekly tracked time is visible by project.
- Completed tasks and weekly wins are archived.
- Reports provide enough evidence to support invoicing, networking, interviews, and self-review.

---

## 14. Acceptance Criteria

The first Codex-built MVP is accepted when:

- The app deploys on a free Vercel plan.
- Supabase free tier is used for persistence and auth.
- Private login protects all user data.
- Supabase RLS is enabled for all user-owned data tables.
- The app includes Command Center, Daily Planner, Weekly Planner, Board, Projects, Project Detail, Task Detail, Inbox, Brain Dump, Resources, Reports, and Archive.
- Manual CRUD works for core entities.
- Quick Capture works for tasks, brain dumps, resources, and time entries.
- Dashboard and report metrics are computed from stored data.
- Desktop layout follows the supplied command-center mockup.
- Mobile layout provides usable command-center and capture flows.
- No paid services are required.
- No telemetry is enabled by default.
- The app remains useful without Gmail, Siri, n8n, or automatic time tracking.
- Future automations can write to stable tables or API endpoints without changing the core product model.

---

## 15. Implementation Notes for Codex

- Build the real app experience first, not a marketing landing page.
- Keep the first screen as the Command Center.
- Seed the app with realistic sample data for first-run development and QA.
- Use shared UI primitives for cards, status pills, filters, tabs, quick capture modals, board columns, and metric widgets.
- Keep `billable` language out of v1 UI unless explicitly requested later.
- Prefer simple forms and editable detail drawers over complex setup flows.
- Avoid overbuilding automation before manual workflows are stable.
- Add a lightweight README with setup, Supabase schema migration steps, environment variables, and deployment instructions.

---

## 16. Glossary

- **Area:** Top-level life domain such as Consulting, Build Lab, Job Search, or Life Admin.
- **Workspace:** Client, sub-domain, or initiative inside an Area.
- **Project:** Bounded body of work with a goal and target date.
- **Task:** Discrete action item.
- **Inbox Item:** Captured or automated item awaiting review.
- **Brain Dump:** Low-pressure capture item for ideas, thoughts, someday items, and links.
- **Resource:** Saved link or reference material.
- **Weekly Snapshot:** Archived weekly report.
- **Momentum Score:** 0-100 weekly signal based on throughput, time, completed work, and captured progress.
- **Quick Capture:** Global actions for adding tasks, brain dumps, resources, and time entries.

---

*End of Codex PRD v1.0*
