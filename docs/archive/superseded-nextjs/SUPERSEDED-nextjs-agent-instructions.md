# CLAUDE.md

## Project: LIVAL OS Supabase App

This repository is for building **LIVAL OS** as a real web application with:

- **Frontend:** Next.js + React + TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase Postgres + Supabase Auth + optional Supabase Storage / Realtime
- **Deployment:** Vercel
- **Primary user:** Liana Valentino
- **App type:** Private personal command center / productivity operating system

LIVAL OS is an ADHD-friendly personal operating system for organizing projects, tasks, resources, time tracking, weekly planning, inbox review, job search, consulting work, AI build projects, home operations, and life admin.

The app should feel like a calm executive dashboard, not a noisy productivity tool.

---

## Source-of-Truth Documents

Before making major architecture, UI, database, or workflow decisions, read these files in the project folder:

1. `LIVAL_OS_Supabase_Vercel_App_Spec.md`
   - Main production app specification.
   - Use this as the primary source of truth for app architecture, Supabase schema, routes, pages, build phases, and deployment.

2. `LIVAL_OS_Frontend_Artifact_Spec_V4_1.md`
   - Approved frontend artifact / visual prototype specification.
   - Use this as the source of truth for visual style, pages, layout, components, dashboard behavior, and ADHD-friendly UX principles.

If there is a conflict, use this priority order:

```text
1. User's latest instruction in chat
2. This CLAUDE.md
3. LIVAL_OS_Supabase_Vercel_App_Spec.md
4. LIVAL_OS_Frontend_Artifact_Spec_V4_1.md
5. Existing codebase conventions
```

---

## Non-Negotiable Product Rules

### 1. Supabase Is the Source of Truth

Supabase should be the canonical backend for structured data:

- areas
- workspaces
- projects
- tasks
- task updates
- time entries
- inbox items
- brain dump items
- resources
- file changes
- activity events
- weekly summaries
- user profile/settings

Do not use local-only mock data as the final implementation. Mock data is allowed only for temporary UI scaffolding.

### 2. Preserve the LIVAL OS Hierarchy

Use this hierarchy throughout the app:

```text
Area
  → Workspace
    → Project
      → Task
```

Example:

```text
Area: Build Lab
Workspace: LIVAL OS
Project: Supabase App
Task: Create database schema
```

### 3. Keep the App ADHD-Friendly

Prioritize:

- calm visual hierarchy
- visible progress
- fewer decisions per screen
- clear next actions
- Today’s Top 3
- inbox-first review
- weekly wins
- lightweight capture
- minimal manual maintenance
- automation-friendly structure

Avoid:

- cluttered dashboards
- too many equal-priority cards
- dense tables as the default UI
- hidden state
- requiring manual timer use as the only time-tracking path

### 4. Do Not Use “Billable” Language

Do not use the word **billable** anywhere in:

- UI labels
- database field names
- reports
- sample data
- seed data
- docs
- comments

Use alternatives like:

- tracked time
- project time
- focus time
- time investment
- weekly time
- work session

### 5. Desktop-First MVP

Build for desktop web first. Mobile responsiveness is welcome, but do not over-optimize the MVP for mobile.

### 6. Do Not Store Secrets in Code

Never commit:

- Supabase service role key
- anon key in non-env files
- Vercel tokens
- personal access tokens
- API keys
- webhook secrets

Use `.env.local` locally and Vercel environment variables in production.

---

## Recommended Implementation Stack

Use this stack unless the user explicitly changes it:

```text
Next.js App Router
TypeScript
Tailwind CSS
shadcn/ui
Supabase SSR client pattern
Supabase Auth
Supabase Postgres
Zod
React Hook Form or Server Actions
Recharts
dnd kit
lucide-react
date-fns
Vercel deployment
```

---

## Expected App Pages

Create these app pages and routes:

```text
/                         → redirect to /command-center or show Command Center
/login                    → auth page
/command-center           → main dashboard
/daily                    → daily planner
/weekly                   → weekly planner
/board                    → Jira-like task board
/projects                 → project list
/projects/[id]            → project detail
/tasks/[id]               → task detail
/inbox                    → approval/review inbox
/brain-dump               → idea capture and promotion
/resources                → resource library
/reports                  → time, progress, weekly wins
/archive                  → completed/archived snapshots
/settings                 → profile/app settings
```

Use route groups if helpful:

```text
app/(auth)/login/page.tsx
app/(dashboard)/command-center/page.tsx
app/(dashboard)/daily/page.tsx
app/(dashboard)/weekly/page.tsx
app/(dashboard)/board/page.tsx
app/(dashboard)/projects/page.tsx
app/(dashboard)/projects/[id]/page.tsx
app/(dashboard)/tasks/[id]/page.tsx
app/(dashboard)/inbox/page.tsx
app/(dashboard)/brain-dump/page.tsx
app/(dashboard)/resources/page.tsx
app/(dashboard)/reports/page.tsx
app/(dashboard)/archive/page.tsx
app/(dashboard)/settings/page.tsx
```

---

## Expected Visual Identity

Preserve the existing LIVAL OS frontend direction:

- calm executive dashboard
- soft neutral background
- card-based layout
- clear sidebar
- top header with search/quick action
- muted colors
- rounded cards
- visible status badges
- progress-forward design
- not corporate Jira clone
- not overly colorful
- not visually overwhelming

Use shadcn/ui components wherever practical:

```text
Button
Card
Badge
Input
Textarea
Select
Tabs
Dialog
Sheet
DropdownMenu
Command
Table
Popover
Calendar
Progress
Separator
ScrollArea
Tooltip
```

Use `lucide-react` for icons.

---

## Core Components to Build

Create reusable components before duplicating UI:

```text
components/app-shell.tsx
components/sidebar.tsx
components/top-header.tsx
components/page-header.tsx
components/quick-capture.tsx
components/status-badge.tsx
components/priority-badge.tsx
components/task-card.tsx
components/project-card.tsx
components/inbox-item-card.tsx
components/resource-card.tsx
components/time-summary-card.tsx
components/weekly-progress-card.tsx
components/empty-state.tsx
components/loading-state.tsx
components/error-state.tsx
```

Organize dashboard-specific components when needed:

```text
components/dashboard/todays-top-three.tsx
components/dashboard/inbox-overview.tsx
components/dashboard/weekly-progress.tsx
components/dashboard/time-this-week.tsx
components/dashboard/board-preview.tsx
components/dashboard/quick-stats.tsx
```

---

## Supabase Database Expectations

Use the database schema in `LIVAL_OS_Supabase_Vercel_App_Spec.md` as the starting point.

Expected tables include:

```text
profiles
areas
workspaces
projects
tasks
task_updates
time_entries
inbox_items
brain_dump_items
resources
file_changes
activity_events
weekly_summaries
automation_runs
```

Important design requirements:

- Every user-owned table should include `user_id`.
- Use UUID primary keys.
- Use `created_at` and `updated_at` timestamps.
- Use `archived_at` where soft-delete/archive behavior matters.
- Use RLS policies from the spec.
- Do not disable RLS for user data tables.
- Use views for dashboard/report queries where helpful.
- Store links/paths/summaries for large artifacts instead of storing huge text blobs in Postgres.

---

## Supabase Client Pattern

Use the modern Supabase SSR pattern for Next.js App Router.

Expected files:

```text
lib/supabase/browser.ts
lib/supabase/server.ts
lib/supabase/admin.ts
middleware.ts
```

Rules:

- Browser client uses the public anon key.
- Server client reads cookies and supports authenticated server components/actions.
- Admin client uses the service role key only on the server.
- Never expose the service role key to the browser.
- Use middleware for session refresh where needed.

---

## Environment Variables

Use these local environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LIVAL_OS_INGEST_SECRET=
```

Optional later:

```bash
GITHUB_TOKEN=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
```

Create `.env.example` with variable names only. Do not include real values.

---

## Ingestion Endpoints

The app should eventually support external updates from Claude Code, Codex, Apple Shortcuts, GitHub, and manual capture.

Create API route handlers under:

```text
app/api/ingest/quick-capture/route.ts
app/api/ingest/time-entry/route.ts
app/api/ingest/file-change/route.ts
app/api/ingest/activity-event/route.ts
```

Security rules:

- Ingestion endpoints must require `LIVAL_OS_INGEST_SECRET`.
- Reject requests without the secret.
- Validate request body with Zod.
- Use service role only inside server route handlers.
- Write structured rows to Supabase.
- Return clear JSON success/error responses.

---

## Required Workflows

### Quick Capture

User should be able to quickly capture:

- task
- idea
- resource
- note
- project update

Captured items should go to Inbox or Brain Dump first unless clearly assigned.

### Inbox Review

Inbox items should support actions:

- convert to task
- convert to project
- convert to resource
- convert to brain dump item
- archive
- dismiss

### Task Management

Tasks should support:

- title
- description
- status
- priority
- due date
- area/workspace/project relationship
- parent task relationship
- estimate/focus size if useful
- labels
- updates
- time entries
- archive/completion

### Board

Board columns should be:

```text
Inbox
Next
In Progress
Waiting
Done
```

Allow cards to move between statuses.

### Time Tracking

Time tracking is mostly automatic. Manual time entry is a fallback.

Support:

- project time summaries
- task time summaries
- weekly time by project
- weekly time by day
- time entries from hooks or API

Do not design the MVP around billable/invoice behavior.

### Reports

Reports should show:

- weekly accomplishment summary
- completed tasks
- time allocation
- project investment
- weekly win log
- momentum score
- recent file/project activity

---

## Build Phases

Work in phases. Do not try to build everything at once.

### Phase 0: Repo and Environment

- Confirm or create Next.js app.
- Install dependencies.
- Configure TypeScript.
- Configure Tailwind.
- Configure shadcn/ui.
- Add `.env.example`.
- Add Supabase client files.
- Add base app shell.

Validation:

```bash
npm run lint
npm run build
```

### Phase 1: Supabase Schema

- Create Supabase migration SQL.
- Add tables from the spec.
- Enable RLS.
- Add basic policies.
- Add seed data script or SQL.
- Add database types generation instructions.

Validation:

- Tables exist.
- RLS is enabled.
- User can only see their own rows.
- Seed data loads.

### Phase 2: Core Dashboard UI

Build static-to-dynamic pages:

- Command Center
- Daily Planner
- Weekly Planner
- Board
- Projects
- Project Detail
- Task Detail
- Inbox
- Brain Dump
- Resources
- Reports
- Archive

Validation:

- Pages render.
- Sidebar links work.
- Cards match the frontend artifact spec.
- Empty states are useful.

### Phase 3: Mutations and Forms

Implement:

- create/edit task
- create/edit project
- quick capture
- convert inbox item
- add resource
- add brain dump item
- log time manually
- update task status

Validation:

- Data persists in Supabase.
- Authenticated user ownership is correct.
- Errors are handled gracefully.

### Phase 4: Ingestion Hooks

Implement secure ingestion APIs:

- quick capture
- time entry
- file change
- activity event

Validation:

- Requests without secret fail.
- Valid requests write rows.
- Dashboard updates reflect inserted data.

### Phase 5: Reports

Implement charts and summaries:

- weekly time by project
- weekly time by day
- completed tasks by week
- active project stats
- weekly wins

Validation:

- Charts render from Supabase data.
- Date ranges are correct.
- Empty states are calm and helpful.

### Phase 6: Deployment

- Prepare Vercel deployment.
- Ensure env vars are documented.
- Verify build passes.
- Verify protected routes work.
- Verify Supabase connection works in production.

---

## Suggested File Structure

```text
.
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── command-center/page.tsx
│   │   ├── daily/page.tsx
│   │   ├── weekly/page.tsx
│   │   ├── board/page.tsx
│   │   ├── projects/page.tsx
│   │   ├── projects/[id]/page.tsx
│   │   ├── tasks/[id]/page.tsx
│   │   ├── inbox/page.tsx
│   │   ├── brain-dump/page.tsx
│   │   ├── resources/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── archive/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   └── ingest/
│   │       ├── quick-capture/route.ts
│   │       ├── time-entry/route.ts
│   │       ├── file-change/route.ts
│   │       └── activity-event/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── app-shell.tsx
│   ├── sidebar.tsx
│   ├── top-header.tsx
│   ├── task-card.tsx
│   ├── project-card.tsx
│   ├── inbox-item-card.tsx
│   └── dashboard/
├── lib/
│   ├── supabase/
│   │   ├── browser.ts
│   │   ├── server.ts
│   │   └── admin.ts
│   ├── queries/
│   ├── actions/
│   ├── validations/
│   ├── utils.ts
│   └── dates.ts
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── scripts/
│   └── generate-types.sh
├── public/
├── .env.example
├── middleware.ts
├── package.json
└── README.md
```

---

## Coding Standards

### TypeScript

- Use TypeScript everywhere.
- Avoid `any` unless unavoidable.
- Create types from Supabase where possible.
- Keep database types in `lib/database.types.ts` or equivalent.

### Components

- Keep components small and reusable.
- Use server components for data-heavy pages where practical.
- Use client components only when needed for interactivity.
- Add `"use client"` only where necessary.

### Styling

- Use Tailwind utilities.
- Use shadcn/ui primitives.
- Do not introduce a second component library unless explicitly approved.
- Keep visual styling calm and consistent.

### Data Access

- Centralize query logic in `lib/queries` or server actions.
- Validate mutations with Zod.
- Return useful errors.
- Handle loading, empty, and error states.

### Naming

Use clear names:

```text
projectTimeSummary
weeklyWins
inboxItems
activeProjects
todaysTopTasks
```

Avoid vague names:

```text
data
thing
stuff
items2
newTable
```

---

## Validation Commands

Run these after meaningful changes:

```bash
npm run lint
npm run build
```

If available, also run:

```bash
npm run typecheck
npm test
```

Before saying a phase is complete, verify:

- app builds
- routes load
- no obvious console errors
- Supabase client works
- env vars are documented
- RLS assumptions are not bypassed
- no secrets were committed

---

## Git and Change Management

Make changes in logical chunks.

After each major phase, provide a concise summary:

```text
Completed:
- what changed
- files created/modified
- validation run
- known gaps
- next recommended step
```

Do not commit unless the user explicitly asks.

Do not push unless the user explicitly asks.

Before destructive changes, explain what will be changed.

---

## User Communication Style

When working with Liana:

- Be direct.
- Break complex setup into small steps.
- Avoid over-explaining basic concepts unless useful.
- Give clear next actions.
- Surface risks early.
- Favor practical implementation over theoretical architecture.
- If blocked, state the exact blocker and the smallest next step.

The user benefits from task momentum and clear validation checkpoints.

---

## Initial Build Prompt for Claude Code

When starting the app build, follow this instruction:

```text
Read CLAUDE.md, LIVAL_OS_Supabase_Vercel_App_Spec.md, and LIVAL_OS_Frontend_Artifact_Spec_V4_1.md.

Build LIVAL OS as a Next.js App Router application using TypeScript, Tailwind CSS, shadcn/ui, Supabase Auth/Postgres, and Vercel deployment conventions.

Start with Phase 0 and Phase 1 only:
1. Confirm the repo state.
2. Create or configure the Next.js app.
3. Install required dependencies.
4. Configure Tailwind and shadcn/ui.
5. Add Supabase client files.
6. Add `.env.example`.
7. Create the initial Supabase migration and seed file based on the app spec.
8. Add a basic protected dashboard layout with sidebar navigation.
9. Run lint/build validation.
10. Summarize files changed, validation results, and the next recommended phase.

Do not skip ahead to advanced automations, Google Sheets sync, GitHub hooks, or client-facing multi-user features until the MVP app shell and Supabase schema are stable.
```

---

## MVP Definition of Done

The MVP is complete when:

- User can log in.
- User can view the Command Center.
- User can create projects.
- User can create tasks.
- User can move tasks across board statuses.
- User can quick-capture inbox items.
- User can convert inbox items into tasks/resources/brain dump items.
- User can view project detail and task detail pages.
- User can log time manually.
- External ingestion endpoints can create quick captures, time entries, file changes, and activity events.
- Reports page shows weekly progress and time summaries.
- RLS prevents users from seeing other users' data.
- App deploys successfully on Vercel.
- No secrets are committed.
- UI preserves the calm LIVAL OS frontend artifact direction.

---

## Out of Scope for Initial MVP

Do not build these unless the user explicitly asks after MVP foundations are stable:

- native mobile app
- payment system
- client-facing SaaS billing
- complex team permissions
- full Google Sheets two-way sync
- full Google Drive document creation
- full GitHub webhook automation
- AI agent orchestration engine
- voice assistant
- Home Assistant integration
- heavy analytics warehouse
- invoice generation

---

## Final Reminder

This app is not a generic task manager.

It is LIVAL OS: a private, calm, automation-friendly operating system for turning brain dumps, projects, AI tool activity, resources, and time investment into visible progress.

Build the simplest real version first, keep the data model clean, and validate each phase before expanding.
