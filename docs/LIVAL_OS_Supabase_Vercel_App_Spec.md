# LIVAL OS App Specification: Next.js Frontend, Supabase Backend, Vercel Deployment

**Document name:** LIVAL OS Supabase + Vercel App Spec  
**Version:** V1.0  
**Date:** June 16, 2026  
**Primary app type:** Private personal command center / productivity operating system  
**Primary user:** Liana Valentino  
**Frontend:** Next.js + React + TypeScript  
**UI system:** Tailwind CSS + shadcn/ui  
**Backend:** Supabase Postgres + Auth + Storage + optional Realtime  
**Deployment:** Vercel  
**Prototype source of truth:** `LIVAL_OS_Frontend_Artifact_Spec_V4_1.md`

---

## 1. Executive Summary

LIVAL OS should be built as a real web application using Supabase as the backend database and Vercel as the deployment platform.

The current Claude Cowork frontend artifact should be treated as the approved design prototype and product specification. The production app should preserve the existing LIVAL OS visual identity, navigation, page structure, hierarchy, and ADHD-friendly principles while replacing mock data with persistent Supabase data.

The app should start as a private single-user system, but the database should be designed so it can later support additional users, client spaces, or shared projects without a full rewrite.

The core architecture is:

```text
Claude Cowork / Claude Code / Codex / Apple Shortcuts / Manual UI
        ↓
Next.js App on Vercel
        ↓
Supabase Auth + Postgres + Storage
        ↓
Optional exports/syncs to Google Sheets, GitHub, Google Drive, or reports
```

Supabase should be the canonical source of truth for structured data. GitHub should remain the source of truth for code and versioned Markdown specs. Google Drive should remain the source of truth for rich documents and files. Google Sheets can remain a reporting, approval, or external dashboard layer, but should not be the primary database once Supabase is introduced.

---

## 2. Product Vision

LIVAL OS is a calm, private, ADHD-friendly personal operating system for organizing consulting work, job search activity, build projects, home operations, life admin, learning, resources, and weekly accomplishment tracking.

The app should reduce decision fatigue by making work visible, organized, and easy to act on.

The system should answer:

- What should I focus on today?
- What is waiting for review?
- What tasks are in progress, blocked, or done?
- What projects are moving forward?
- How much time did I spend this week?
- What did I accomplish this week?
- What ideas, resources, or open loops have I captured?

The app should feel like a calm executive dashboard, not a busy productivity app.

---

## 3. Core Principles

### 3.1 Automatic First

The app should assume that most useful updates arrive automatically from tools and workflows, including:

- Claude Code activity logs
- Claude Cowork planning outputs
- Codex project work
- Apple Shortcuts quick capture
- Manual quick capture
- GitHub file/activity metadata
- Resource/link captures
- Project/task update hooks
- Time tracking events written by project tooling

The frontend should make these updates visible, reviewable, and actionable.

### 3.2 Minimal Manual Maintenance

Manual actions should be limited to:

- Add Task
- Add Brain Dump
- Add Resource
- Log Time manually as fallback
- Approve Inbox Item
- Convert Inbox Item to Task / Project / Resource
- Move task between board columns
- Adjust daily plan
- Create new project

The app should not require the user to manually start or stop focus timers.

### 3.3 Desktop First

The first production app should be optimized for desktop web use. Mobile responsiveness is useful, but mobile app behavior is not part of the MVP.

### 3.4 Progress Visibility

Reports, weekly summaries, time allocation, completed task counts, and Weekly Win Logs are key motivational features.

The app should help the user see evidence of progress while unemployed, consulting, building AI projects, and managing life/admin tasks.

### 3.5 No Billable Language

Do not use the word “billable” anywhere in the UI, reports, database labels, or sample data unless explicitly requested later.

---

## 4. Recommended Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| App framework | Next.js | Production web app framework |
| Language | TypeScript | Type safety across frontend and backend |
| UI | React | Componentized dashboard UI |
| Styling | Tailwind CSS | Fast, consistent styling |
| Components | shadcn/ui | Accessible reusable dashboard components |
| Backend | Supabase Postgres | Canonical relational database |
| Auth | Supabase Auth | User identity and session management |
| Storage | Supabase Storage | Optional storage for small uploads and generated exports |
| Hosting | Vercel | Deploy frontend and serverless routes |
| Charts | Recharts | Progress, time, and reporting charts |
| Drag/drop | dnd kit | Board card movement |
| Validation | Zod | Runtime validation for forms and server actions |
| Forms | React Hook Form or native Server Actions | Task/project/resource forms |
| Dates | date-fns | Date formatting and weekly range logic |
| Icons | lucide-react | Sidebar, actions, status icons |

---

## 5. System Architecture

### 5.1 High-Level Architecture

```text
User
 ↓
Next.js UI
 ↓
Server Components / Server Actions / Route Handlers
 ↓
Supabase client
 ↓
Supabase Postgres tables, views, functions, and RLS policies
```

### 5.2 External Input Architecture

```text
Claude Code Hook
Codex Hook
Apple Shortcut
Manual Quick Capture
GitHub Activity Event
Google Drive / Resource Capture
        ↓
/api/ingest/* route handler or direct Supabase write through service role
        ↓
inbox_items, tasks, resources, time_entries, file_changes, activity_events
        ↓
Inbox review and dashboard updates
```

### 5.3 Source of Truth Rules

| Data Type | Source of Truth |
|---|---|
| Areas, workspaces, projects, tasks | Supabase |
| Task updates and activity events | Supabase |
| Time entries | Supabase |
| Inbox review state | Supabase |
| Brain dump items | Supabase |
| Resource metadata | Supabase |
| Code files | GitHub/local repos |
| Markdown specs | GitHub/local repos, optionally mirrored in Supabase metadata |
| Rich docs | Google Drive |
| Dashboard/report exports | Supabase views, optionally pushed to Google Sheets |
| Large raw transcripts/logs | GitHub, local storage, or Drive; store only summary/path in Supabase |

---

## 6. App Information Architecture

Use the approved LIVAL OS hierarchy everywhere:

```text
Area
  ↓
Workspace
  ↓
Project
  ↓
Task
```

Examples:

```text
Area: Consulting
Workspace: ETD
Project: Enertia ROI Calculator
Task: Update pricing logic
```

```text
Area: Build Lab
Workspace: Auto Job Apply Agent
Project: MVP Architecture
Task: Define MVP workflow
```

```text
Area: Life Admin
Workspace: Health
Project: Appointments
Task: Schedule dentist appointment
```

### 6.1 Default Areas

- Consulting
- Build Lab
- Job Search
- Life Admin
- Home Ops
- Learning

### 6.2 Default Board Statuses

- Backlog
- This Week
- In Progress
- Blocked
- Done

The Board page may display “Done This Week” as a filtered view of tasks with status `done` and a completion date in the current week.

### 6.3 Priority Values

- High
- Medium
- Low

Do not use P0/P1/P2 wording.

---

## 7. Required App Pages

The production app must preserve the approved page list from the frontend artifact:

1. Command Center
2. Daily Planner
3. Weekly Planner
4. Board
5. Projects
6. Project Detail
7. Task Detail
8. Inbox
9. Brain Dump
10. Resources
11. Reports
12. Archive
13. Settings

Settings can be added as a practical production page for profile, integrations, and data management, even though it was not a core artifact page.

---

## 8. Frontend Route Structure

Use the Next.js App Router.

Recommended route tree:

```text
src/
  app/
    layout.tsx
    page.tsx                         # redirect to /command-center
    login/
      page.tsx
    command-center/
      page.tsx
    daily-planner/
      page.tsx
    weekly-planner/
      page.tsx
    board/
      page.tsx
    projects/
      page.tsx
      [projectId]/
        page.tsx
    tasks/
      [taskId]/
        page.tsx
    inbox/
      page.tsx
    brain-dump/
      page.tsx
    resources/
      page.tsx
    reports/
      page.tsx
    archive/
      page.tsx
      [weekId]/
        page.tsx
    settings/
      page.tsx
    api/
      ingest/
        quick-capture/
          route.ts
        time-entry/
          route.ts
        file-change/
          route.ts
        activity-event/
          route.ts
      exports/
        weekly-summary/
          route.ts
```

---

## 9. Frontend Component Structure

Recommended component structure:

```text
src/
  components/
    app-shell/
      app-shell.tsx
      sidebar.tsx
      top-header.tsx
      sidebar-time-card.tsx
      quick-capture.tsx
    command-center/
      todays-top-three.tsx
      inbox-overview.tsx
      weekly-progress.tsx
      time-this-week.tsx
      board-preview.tsx
      quick-stats.tsx
    planner/
      daily-focus.tsx
      schedule-deadlines.tsx
      unplanned-items.tsx
      weekly-calendar.tsx
      weekly-outcomes.tsx
    board/
      board-column.tsx
      task-card.tsx
      board-filters.tsx
    projects/
      project-card.tsx
      project-detail-header.tsx
      project-tabs.tsx
    tasks/
      task-detail-header.tsx
      task-detail-tabs.tsx
      task-time-widget.tsx
    inbox/
      inbox-tabs.tsx
      inbox-item-card.tsx
      convert-item-dialog.tsx
    brain-dump/
      brain-dump-item.tsx
      add-idea-dialog.tsx
    resources/
      resource-card.tsx
      resource-category-list.tsx
    reports/
      kpi-card.tsx
      weekly-win-log.tsx
      time-allocation-chart.tsx
      project-investment-table.tsx
      momentum-score.tsx
    ui/
      shadcn components
  lib/
    supabase/
      client.ts
      server.ts
      middleware.ts
    db/
      queries.ts
      mutations.ts
      types.ts
    validations/
      task.ts
      project.ts
      resource.ts
      inbox.ts
    dates.ts
    permissions.ts
```

---

## 10. Database Design

### 10.1 Design Goals

The Supabase schema should support:

- Single-user MVP
- Future multi-user support
- Project/task hierarchy
- Subtasks
- Task status and board movement
- Time tracking
- File change tracking
- Inbox review workflow
- Brain dump conversion workflow
- Resource library
- Weekly reporting
- Automation logs
- Integrations from Claude, Codex, Apple Shortcuts, GitHub, and Google tools

### 10.2 Recommended Tables

Core tables:

```text
profiles
areas
workspaces
projects
tasks
task_updates
time_entries
file_changes
resources
inbox_items
brain_dump_items
daily_plans
weekly_plans
weekly_summaries
activity_events
automation_runs
integrations
```

Optional later tables:

```text
task_dependencies
project_milestones
resource_tags
task_tags
saved_views
notifications
calendar_events
external_links
```

---

## 11. Supabase SQL Starter Migration

This is the recommended starter schema for MVP implementation.

```sql
-- LIVAL OS Supabase Starter Schema
-- Run in Supabase SQL Editor or as a migration.

create extension if not exists "uuid-ossp";

-- ---------- ENUMS ----------

do $$ begin
  create type task_status as enum ('backlog', 'this_week', 'in_progress', 'blocked', 'done', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type priority_level as enum ('high', 'medium', 'low');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type project_health as enum ('on_track', 'needs_attention', 'blocked', 'paused', 'complete');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type inbox_type as enum ('email', 'appointment', 'idea', 'resource', 'task', 'file', 'activity', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type inbox_status as enum ('unreviewed', 'approved', 'converted', 'archived');
exception when duplicate_object then null;
end $$;

-- ---------- PROFILES ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text default 'America/Los_Angeles',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- AREAS ----------

create table if not exists public.areas (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer default 0,
  color text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

-- ---------- WORKSPACES ----------

create table if not exists public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  name text not null,
  description text,
  sort_order integer default 0,
  color text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, area_id, name)
);

-- ---------- PROJECTS ----------

create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'active',
  health project_health not null default 'on_track',
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  start_date date,
  target_date date,
  completed_at timestamptz,
  external_url text,
  repo_path text,
  github_url text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- TASKS ----------

create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  parent_task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'backlog',
  priority priority_level not null default 'medium',
  labels text[] not null default '{}',
  due_date date,
  estimated_minutes integer,
  completed_at timestamptz,
  sort_order integer default 0,
  source text,
  external_url text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_user_status on public.tasks(user_id, status);
create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_due_date on public.tasks(user_id, due_date);
create index if not exists idx_tasks_parent on public.tasks(parent_task_id);

-- ---------- TASK UPDATES ----------

create table if not exists public.task_updates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  update_type text not null default 'note',
  body text not null,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- TIME ENTRIES ----------

create table if not exists public.time_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  entry_date date not null default current_date,
  started_at timestamptz,
  ended_at timestamptz,
  minutes integer not null check (minutes > 0),
  source text not null default 'manual',
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_time_entries_user_date on public.time_entries(user_id, entry_date);
create index if not exists idx_time_entries_project on public.time_entries(project_id);
create index if not exists idx_time_entries_task on public.time_entries(task_id);

-- ---------- FILE CHANGES ----------

create table if not exists public.file_changes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  file_path text not null,
  change_type text,
  repo_path text,
  github_url text,
  summary text,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- RESOURCES ----------

create table if not exists public.resources (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  url text,
  category text default 'Other',
  notes text,
  source text,
  labels text[] not null default '{}',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- INBOX ITEMS ----------

create table if not exists public.inbox_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type inbox_type not null default 'other',
  status inbox_status not null default 'unreviewed',
  title text not null,
  body text,
  source text,
  sender text,
  suggested_area_id uuid references public.areas(id) on delete set null,
  suggested_workspace_id uuid references public.workspaces(id) on delete set null,
  suggested_project_id uuid references public.projects(id) on delete set null,
  suggested_task_id uuid references public.tasks(id) on delete set null,
  suggested_classification text,
  converted_to_type text,
  converted_to_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_inbox_user_status on public.inbox_items(user_id, status);

-- ---------- BRAIN DUMP ----------

create table if not exists public.brain_dump_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  item_type text not null default 'idea',
  status text not null default 'captured',
  labels text[] not null default '{}',
  converted_to_type text,
  converted_to_id uuid,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- DAILY PLANS ----------

create table if not exists public.daily_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  must_do_task_ids uuid[] not null default '{}',
  should_do_task_ids uuid[] not null default '{}',
  could_do_task_ids uuid[] not null default '{}',
  notes text,
  generated_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, plan_date)
);

-- ---------- WEEKLY PLANS ----------

create table if not exists public.weekly_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  outcomes text[] not null default '{}',
  focus_areas text[] not null default '{}',
  open_loops text[] not null default '{}',
  generated_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_start)
);

-- ---------- WEEKLY SUMMARIES ----------

create table if not exists public.weekly_summaries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  tasks_completed integer not null default 0,
  minutes_tracked integer not null default 0,
  projects_advanced integer not null default 0,
  ideas_captured integer not null default 0,
  win_log text[] not null default '{}',
  summary text,
  momentum_score integer check (momentum_score >= 0 and momentum_score <= 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_start)
);

-- ---------- ACTIVITY EVENTS ----------

create table if not exists public.activity_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  event_type text not null,
  title text not null,
  body text,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- AUTOMATION RUNS ----------

create table if not exists public.automation_runs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  automation_name text not null,
  source text,
  status text not null default 'success',
  input_summary text,
  output_summary text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------- INTEGRATIONS ----------

create table if not exists public.integrations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  display_name text,
  status text not null default 'active',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider, display_name)
);
```

---

## 12. Row Level Security

Enable RLS on all user-owned tables.

Single-user MVP can still use user-based policies so the app does not need to be rewritten later.

```sql
alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.workspaces enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_updates enable row level security;
alter table public.time_entries enable row level security;
alter table public.file_changes enable row level security;
alter table public.resources enable row level security;
alter table public.inbox_items enable row level security;
alter table public.brain_dump_items enable row level security;
alter table public.daily_plans enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.weekly_summaries enable row level security;
alter table public.activity_events enable row level security;
alter table public.automation_runs enable row level security;
alter table public.integrations enable row level security;
```

Recommended policy pattern:

```sql
-- Profiles
create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id);

-- Generic user-owned table pattern. Repeat for user-owned tables.
create policy "Users can select own areas"
on public.areas
for select
using (auth.uid() = user_id);

create policy "Users can insert own areas"
on public.areas
for insert
with check (auth.uid() = user_id);

create policy "Users can update own areas"
on public.areas
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own areas"
on public.areas
for delete
using (auth.uid() = user_id);
```

Repeat the generic policy pattern for:

```text
workspaces
projects
tasks
task_updates
time_entries
file_changes
resources
inbox_items
brain_dump_items
daily_plans
weekly_plans
weekly_summaries
activity_events
automation_runs
integrations
```

### 12.1 Service Role Rule

The Supabase service role key may be used only from trusted server-side code, such as:

- Vercel Route Handlers
- Server-only ingestion endpoints
- Local migration scripts
- Trusted admin scripts

Never expose the service role key in client components, browser code, public environment variables, or Apple Shortcuts.

---

## 13. Database Views for Dashboard Queries

Create views to keep frontend queries simple.

### 13.1 Weekly Time by Project

```sql
create or replace view public.v_weekly_time_by_project as
select
  user_id,
  date_trunc('week', entry_date)::date as week_start,
  project_id,
  sum(minutes) as total_minutes
from public.time_entries
group by user_id, date_trunc('week', entry_date), project_id;
```

### 13.2 Weekly Time by Day

```sql
create or replace view public.v_weekly_time_by_day as
select
  user_id,
  date_trunc('week', entry_date)::date as week_start,
  entry_date,
  sum(minutes) as total_minutes
from public.time_entries
group by user_id, date_trunc('week', entry_date), entry_date;
```

### 13.3 Tasks Completed by Week

```sql
create or replace view public.v_tasks_completed_by_week as
select
  user_id,
  date_trunc('week', completed_at)::date as week_start,
  count(*) as tasks_completed
from public.tasks
where completed_at is not null
  and status = 'done'
group by user_id, date_trunc('week', completed_at);
```

### 13.4 Active Project Stats

```sql
create or replace view public.v_project_stats as
select
  p.id as project_id,
  p.user_id,
  p.name,
  p.area_id,
  p.workspace_id,
  p.health,
  p.progress_percent,
  p.target_date,
  count(t.id) filter (where t.status != 'archived') as total_tasks,
  count(t.id) filter (where t.status = 'done') as done_tasks,
  count(t.id) filter (where t.status = 'blocked') as blocked_tasks,
  coalesce(sum(te.minutes), 0) as total_minutes
from public.projects p
left join public.tasks t on t.project_id = p.id
left join public.time_entries te on te.project_id = p.id
where p.is_archived = false
group by p.id;
```

---

## 14. Required Query Functions

Create a query layer in `src/lib/db/queries.ts` rather than scattering Supabase queries throughout components.

Required query functions:

```ts
getCommandCenterData(userId: string)
getTodaysTopThree(userId: string, date: Date)
getInboxOverview(userId: string)
getWeeklyProgress(userId: string, weekStart: Date)
getWeeklyTimeBreakdown(userId: string, weekStart: Date)
getBoardTasks(userId: string, filters: BoardFilters)
getProjects(userId: string, filters?: ProjectFilters)
getProjectDetail(userId: string, projectId: string)
getTaskDetail(userId: string, taskId: string)
getInboxItems(userId: string, filters?: InboxFilters)
getBrainDumpItems(userId: string, filters?: BrainDumpFilters)
getResources(userId: string, filters?: ResourceFilters)
getWeeklyReport(userId: string, weekStart: Date)
getArchiveWeeks(userId: string)
```

Required mutation functions:

```ts
createTask(input: CreateTaskInput)
updateTask(input: UpdateTaskInput)
moveTask(taskId: string, status: TaskStatus, sortOrder?: number)
createProject(input: CreateProjectInput)
updateProject(input: UpdateProjectInput)
createBrainDumpItem(input: CreateBrainDumpInput)
convertBrainDumpItem(input: ConvertBrainDumpInput)
createResource(input: CreateResourceInput)
approveInboxItem(input: ApproveInboxInput)
convertInboxItem(input: ConvertInboxInput)
archiveInboxItem(id: string)
createTimeEntry(input: CreateTimeEntryInput)
createActivityEvent(input: CreateActivityEventInput)
```

---

## 15. Authentication

### 15.1 MVP Auth

For the private MVP, use Supabase Auth with one of:

- Email/password login
- Magic link login
- Google OAuth login

Recommended MVP: email/password or magic link.

### 15.2 User Profile Creation

After signup, create a `profiles` record for the user.

Option A: database trigger on `auth.users` insert.  
Option B: create profile record in the first authenticated server action.

### 15.3 Protected Routes

All app pages except `/login` should require an authenticated user.

Protected routes:

```text
/command-center
/daily-planner
/weekly-planner
/board
/projects
/tasks/*
/inbox
/brain-dump
/resources
/reports
/archive
/settings
```

---

## 16. Environment Variables

### 16.1 Local `.env.local`

Use this structure:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
LIVAL_INGEST_SECRET="a-long-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 16.2 Vercel Environment Variables

Configure the same values in Vercel Project Settings:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
LIVAL_INGEST_SECRET
NEXT_PUBLIC_APP_URL
```

Important rules:

- `NEXT_PUBLIC_*` values are available in the browser.
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to browser/client code.
- `LIVAL_INGEST_SECRET` should be used to protect ingestion endpoints from unauthorized writes.
- After changing Vercel environment variables, redeploy the app.

---

## 17. Supabase Client Setup

Recommended files:

```text
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/middleware.ts
```

### 17.1 Browser Client

Use only public Supabase keys.

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

### 17.2 Server Client

Use cookie-aware SSR setup.

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component cookies cannot be set directly.
            // Middleware can refresh user sessions.
          }
        },
      },
    }
  )
}
```

### 17.3 Admin Client

Use only in server-only ingestion routes or scripts.

```ts
// src/lib/supabase/admin.ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

---

## 18. Ingestion Endpoints

Ingestion endpoints let Claude Code, Codex, Apple Shortcuts, or local scripts write structured updates into Supabase.

### 18.1 Security Pattern

Every ingestion request should include a secret header:

```text
x-lival-ingest-secret: <LIVAL_INGEST_SECRET>
```

If the header does not match the environment variable, return `401 Unauthorized`.

### 18.2 Quick Capture Endpoint

Route:

```text
POST /api/ingest/quick-capture
```

Purpose:

- Capture ideas
- Capture links
- Capture loose tasks
- Capture unclassified thoughts
- Insert into `inbox_items` or `brain_dump_items`

Example request:

```json
{
  "type": "idea",
  "title": "Build AI travel points dashboard",
  "body": "Could connect Chase, Amex, Bilt, and award alerts later.",
  "source": "apple_shortcut",
  "labels": ["travel", "points", "build_lab"]
}
```

### 18.3 Time Entry Endpoint

Route:

```text
POST /api/ingest/time-entry
```

Purpose:

- Write automatic or manual time entries
- Connect entries to area/workspace/project/task when known

Example request:

```json
{
  "project_id": "uuid",
  "task_id": "uuid",
  "entry_date": "2026-06-16",
  "minutes": 42,
  "source": "claude_code",
  "summary": "Updated Supabase schema and Vercel deployment spec."
}
```

### 18.4 File Change Endpoint

Route:

```text
POST /api/ingest/file-change
```

Purpose:

- Track files changed by Claude Code, Codex, or manual work
- Store metadata, not full file contents

Example request:

```json
{
  "project_id": "uuid",
  "task_id": "uuid",
  "file_path": "docs/LIVAL_OS_Supabase_Vercel_App_Spec.md",
  "change_type": "created",
  "repo_path": "~/Cowork/lival-os",
  "summary": "Created production app spec for Supabase and Vercel."
}
```

### 18.5 Activity Event Endpoint

Route:

```text
POST /api/ingest/activity-event
```

Purpose:

- Capture general activity timeline events
- Feed Project Detail, Task Detail, Reports, and Weekly Win Log

Example request:

```json
{
  "event_type": "spec_created",
  "title": "Created Supabase + Vercel app spec",
  "body": "Defined Next.js routes, Supabase schema, RLS, and deployment workflow.",
  "source": "chatgpt",
  "project_id": "uuid"
}
```

---

## 19. Page-to-Database Mapping

### 19.1 Command Center

Uses:

```text
tasks
projects
inbox_items
brain_dump_items
time_entries
weekly_summaries
activity_events
v_weekly_time_by_project
v_weekly_time_by_day
v_tasks_completed_by_week
```

Widgets:

- Today’s Top 3 → `tasks`, `daily_plans`
- Inbox Overview → `inbox_items`
- Weekly Progress → `tasks`, `weekly_summaries`
- Time Tracking This Week → `time_entries`, `v_weekly_time_by_project`
- Board Preview → `tasks`
- Quick Stats → `tasks`, `projects`, `inbox_items`, `brain_dump_items`

### 19.2 Daily Planner

Uses:

```text
daily_plans
tasks
inbox_items
activity_events
```

Required behavior:

- Show Must Do / Should Do / Could Do
- Pull unplanned items from inbox
- Allow “Adjust my plan”
- Store saved plan in `daily_plans`

### 19.3 Weekly Planner

Uses:

```text
weekly_plans
tasks
projects
time_entries
```

Required behavior:

- Show outcomes
- Show focus areas
- Show open loops
- Show weekly calendar-style blocks
- Store saved plan in `weekly_plans`

### 19.4 Board

Uses:

```text
tasks
projects
workspaces
areas
time_entries
```

Required behavior:

- Columns: Backlog, This Week, In Progress, Blocked, Done This Week
- Drag/drop updates task status
- Cards show workspace/project, title, labels, priority, due date, tracked time
- Filters by area, project, label, priority, due date, status, search

### 19.5 Projects

Uses:

```text
projects
areas
workspaces
tasks
time_entries
v_project_stats
```

Required behavior:

- Group projects by Area
- Show progress, health, time this week, target date
- Open Project Detail

### 19.6 Project Detail

Uses:

```text
projects
tasks
time_entries
file_changes
resources
activity_events
```

Tabs:

- Overview
- Tasks
- Timeline
- Time
- Resources
- Notes
- Activity

### 19.7 Task Detail

Uses:

```text
tasks
task_updates
time_entries
file_changes
activity_events
resources
```

Tabs:

- Details
- Subtasks
- Files
- Notes
- Activity

### 19.8 Inbox

Uses:

```text
inbox_items
tasks
projects
resources
brain_dump_items
```

Actions:

- Approve
- Convert to Task
- Convert to Project
- Save as Resource
- Archive

### 19.9 Brain Dump

Uses:

```text
brain_dump_items
tasks
projects
resources
```

Actions:

- Add Idea
- Convert to Project
- Convert to Task
- Archive

### 19.10 Resources

Uses:

```text
resources
projects
areas
workspaces
```

Actions:

- Add Resource
- Filter by category
- Search resources
- Attach to project

### 19.11 Reports

Uses:

```text
weekly_summaries
tasks
time_entries
projects
brain_dump_items
activity_events
v_weekly_time_by_project
v_weekly_time_by_day
v_tasks_completed_by_week
```

Required sections:

- KPI cards
- Time allocation
- Project investment
- Weekly Win Log
- Weekly Summary
- Momentum Score

### 19.12 Archive

Uses:

```text
weekly_summaries
```

Required behavior:

- List previous weekly snapshots
- Open archived weekly report

---

## 20. UI Requirements

### 20.1 Visual Style

Preserve the approved style from the artifact:

- Light main canvas
- Dark navy sidebar
- Purple accent color
- Rounded cards
- Soft shadows or subtle borders
- Clear spacing
- Compact but readable text
- Color-coded priority labels
- Minimal visual clutter

### 20.2 Sidebar

Persistent desktop sidebar with:

```text
LIVAL OS
Personal Command Center
```

Navigation:

1. Command Center
2. Daily Planner
3. Weekly Planner
4. Board
5. Projects
6. Inbox
7. Brain Dump
8. Resources
9. Reports
10. Archive
11. Settings

Sidebar quick capture:

- + Add Task
- + Brain Dump
- + Add Resource
- Log Time

Sidebar time card:

```text
This Week’s Time
34.2h
M T W T F S S
bar chart
```

### 20.3 Top Header

Each main page should include:

- Current page title
- Date selector
- Search bar
- Notifications icon
- Settings icon
- User avatar

### 20.4 Cards

Cards should include:

- Header/title
- Optional subtitle
- Key metric or content
- Bottom action link where relevant

### 20.5 Task Cards

Task card fields:

- Task title
- Workspace
- Project
- Priority
- Due date
- Status
- Labels
- Time tracked

### 20.6 Project Cards

Project card fields:

- Project name
- Workspace/client
- Progress ring or bar
- Health status
- Time this week
- Target date

---

## 21. MVP Build Phases

### Phase 0: Repo and Environment Setup

Goal: Create the production app skeleton.

Tasks:

- Create GitHub repo: `lival-os-app`
- Create Next.js app with TypeScript, App Router, Tailwind
- Install shadcn/ui
- Install Supabase packages
- Install Recharts, dnd kit, date-fns, zod, lucide-react
- Create Supabase project
- Add environment variables locally and in Vercel
- Deploy blank authenticated app to Vercel

Acceptance criteria:

- App runs locally
- App deploys to Vercel
- Login works
- Protected routes redirect unauthenticated users

### Phase 1: Database + Seed Data

Goal: Replace mock data with Supabase-backed seed data.

Tasks:

- Run starter SQL migration
- Enable RLS
- Add initial areas and workspaces
- Add sample projects and tasks matching the approved artifact
- Build query layer
- Build mutation layer

Acceptance criteria:

- Command Center reads real Supabase data
- Board reads real tasks
- Projects page reads real projects
- RLS prevents cross-user access

### Phase 2: Core UI Pages

Goal: Implement the approved frontend pages with real data.

Tasks:

- App Shell
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

Acceptance criteria:

- Page list matches the approved artifact
- Navigation works
- No billable language appears
- UI feels calm and not overcrowded
- Cards and filters work

### Phase 3: Mutations and Workflows

Goal: Add interactive data changes.

Tasks:

- Create task
- Edit task
- Move task across Board columns
- Create project
- Add resource
- Add brain dump item
- Convert brain dump item to task/project
- Approve/convert/archive inbox items
- Add time entry manually

Acceptance criteria:

- User can manage projects and tasks without touching Supabase directly
- Inbox review workflow works
- Brain dump conversion works
- Board movement persists

### Phase 4: Ingestion Hooks

Goal: Allow external tools to write updates.

Tasks:

- Build protected ingestion endpoints
- Add local scripts for Claude Code / Codex
- Add Apple Shortcut quick capture endpoint
- Add file change endpoint
- Add time entry endpoint
- Add activity event endpoint

Acceptance criteria:

- External tool can create inbox item
- External tool can log time
- External tool can log file change
- Activity appears in Project Detail and Reports

### Phase 5: Reports and Weekly Summaries

Goal: Make weekly progress visible.

Tasks:

- Build weekly report query
- Generate Weekly Win Log
- Generate weekly summary text
- Calculate momentum score
- Store weekly summary snapshots
- Build archive view

Acceptance criteria:

- Reports page shows weekly accomplishments
- Archive stores previous weeks
- Weekly Win Log is visually prominent

### Phase 6: Optional Syncs

Goal: Add useful external reporting and backups.

Optional tasks:

- Export weekly summaries to Markdown
- Export reports to Google Sheets
- Link GitHub commits to file changes
- Link Google Drive docs to resources/projects
- Add calendar event ingestion

Acceptance criteria:

- Supabase remains source of truth
- External syncs are optional views/exports, not primary storage

---

## 22. Setup Commands

### 22.1 Create App

Recommended if starting from Supabase template:

```bash
npx create-next-app -e with-supabase lival-os-app
cd lival-os-app
```

Alternative if starting from standard Next.js:

```bash
npx create-next-app@latest lival-os-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd lival-os-app
npm install @supabase/supabase-js @supabase/ssr
```

### 22.2 Install UI and App Dependencies

```bash
npx shadcn@latest init
npm install recharts @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities date-fns zod lucide-react
```

Add common shadcn components:

```bash
npx shadcn@latest add button card dialog dropdown-menu input label select separator sheet tabs textarea badge table avatar calendar popover command checkbox progress
```

### 22.3 Local Development

```bash
npm run dev
```

### 22.4 Build Check

```bash
npm run lint
npm run build
```

---

## 23. Vercel Deployment

### 23.1 Deployment Flow

Recommended flow:

```text
GitHub repo
  ↓
Vercel project connected to repo
  ↓
Automatic preview deployments for branches / pull requests
  ↓
Production deployment from main branch
```

### 23.2 Vercel Project Settings

Required configuration:

- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: default
- Install Command: `npm install`
- Environment Variables: add all values from Section 16

### 23.3 Deployment Validation

After deployment:

- Visit production URL
- Confirm login works
- Confirm protected routes redirect correctly
- Confirm Supabase reads work
- Confirm creating a test task works
- Confirm task is visible in Supabase table
- Confirm environment variable changes trigger redeploy

---

## 24. Seed Data

Create a seed script or SQL insert for these default Areas:

```text
Consulting
Build Lab
Job Search
Life Admin
Home Ops
Learning
```

Default Workspaces:

```text
Consulting / ETD
Consulting / Bistro
Consulting / Emergent
Build Lab / Auto Job Apply Agent
Build Lab / Personal Trainer Agent
Build Lab / Portfolio Projects
Home Ops / Home Assistant
Home Ops / Cameras
Home Ops / HVAC
Home Ops / Z-Wave
Home Ops / Automations
Life Admin / Health
Life Admin / Finance
Life Admin / Travel
Life Admin / Shopping
Life Admin / Appointments
Job Search / Applications
Job Search / Resume
Job Search / LinkedIn
Job Search / Networking
Job Search / Interview Prep
```

Sample Projects:

```text
ETD / Enertia ROI Calculator
Bistro / Website Update
Emergent / Client Ops
Auto Job Apply Agent / MVP Architecture
Personal Trainer Agent / Agent Design
Home Assistant Agent / Camera Dashboard
Travel / Chicago Trip
Health / Appointments
```

Sample Tasks:

```text
Update pricing logic
Remove labor section
Test calculations
Validate with Mike
Apply to 5 roles
Define MVP architecture
Set up camera dashboard
Schedule dentist appointment
Book flight to Chicago
Review website update
```

Sample Resources:

```text
Claude Code Best Practices
Databricks Interview Guide
Home Assistant Automation Guide
ETD Onboarding Docs
Chicago Travel Guide
```

Sample Inbox Items:

```text
From Mike (ETD): Enertia calculator updates
Dentist appointment confirmation
From Matt (Bistro): Website images and copy
Idea: Build travel points dashboard
Claude article: Best Claude Code practices
```

---

## 25. Testing and Validation

### 25.1 Functional Checks

- User can log in.
- User can log out.
- User can create a task.
- User can update a task.
- User can move a task between board columns.
- User can create a project.
- User can create a resource.
- User can add a brain dump item.
- User can convert a brain dump item into a task.
- User can approve an inbox item.
- User can log a time entry.
- Reports update after tasks/time entries change.

### 25.2 RLS Checks

- Authenticated user can only read their own records.
- Authenticated user can only update their own records.
- Anonymous users cannot read private tables.
- Service role routes are not accessible without the ingest secret.

### 25.3 UI Checks

- Sidebar appears on all protected app pages.
- Command Center matches approved layout.
- Daily Planner uses Must Do / Should Do / Could Do.
- Weekly Planner has a large Weekly Calendar.
- Board page is named “Board,” not “Kanban Board.”
- Reports include Weekly Win Log.
- No “billable” language appears anywhere.
- UI is calm, readable, and uncluttered.

### 25.4 Deployment Checks

- App builds locally.
- App builds on Vercel.
- Environment variables are present in Vercel.
- Supabase URL and publishable key work in production.
- Service role key is not exposed in browser bundle.
- Ingestion endpoints reject missing/invalid secrets.

---

## 26. Free Tier Guardrails

To keep the app lightweight:

- Store structured records in Supabase.
- Store only summaries, URLs, file paths, and metadata for files.
- Do not store full raw chat transcripts in Postgres.
- Do not store full code files in Postgres.
- Do not store large PDFs, images, videos, or generated docs in Postgres.
- Use GitHub for code/specs.
- Use Google Drive for large documents.
- Use Supabase Storage only for small uploads or generated exports that need app access.
- Archive old activity events or weekly snapshots if the database grows too large.

---

## 27. Security Requirements

- Use Supabase Auth for all app access.
- Enable RLS on all user-owned tables.
- Never expose the service role key to the browser.
- Protect ingestion endpoints with `LIVAL_INGEST_SECRET`.
- Validate all endpoint payloads with Zod.
- Store external API tokens only in server-side environment variables or secure provider settings.
- Do not commit `.env.local` to GitHub.
- Add `.env.local` to `.gitignore`.
- Use separate preview and production environment variables when needed.

---

## 28. Initial Builder Prompt for Codex or Claude Code

Use this prompt to start the build:

```text
You are building LIVAL OS as a production Next.js app.

Use this document as the implementation spec:
LIVAL_OS_Supabase_Vercel_App_Spec.md

Use this frontend artifact spec as the UI/product source of truth:
LIVAL_OS_Frontend_Artifact_Spec_V4_1.md

Goal:
Build a private personal command center using Next.js, TypeScript, Tailwind CSS, shadcn/ui, Supabase Auth, Supabase Postgres, and Vercel deployment.

Important constraints:
- Preserve the approved LIVAL OS page list and dashboard layout.
- Use Supabase as the canonical source of truth for structured data.
- Use the hierarchy Area → Workspace → Project → Task.
- Do not use the word “billable” anywhere.
- The Board page should be named “Board,” not “Kanban Board.”
- Do not build a generic productivity app.
- Keep the UI calm, visual, executive, and ADHD-friendly.
- Build desktop-first.
- Use real Supabase data after the initial skeleton.
- Implement RLS and protected routes.
- Never expose the Supabase service role key client-side.

First implementation milestone:
1. Create the Next.js app structure.
2. Set up shadcn/ui.
3. Set up Supabase client/server utilities.
4. Create the app shell, sidebar, and top header.
5. Implement login/protected route behavior.
6. Add placeholder pages for all approved routes.
7. Add the Supabase SQL migration file from this spec.
8. Add seed data script for default areas, workspaces, projects, tasks, resources, and inbox items.
9. Deploy the skeleton app to Vercel.

After this first milestone, stop and provide:
- Files created/changed
- Setup steps completed
- Environment variables required
- What still needs to be manually configured in Supabase/Vercel
- Validation checklist
```

---

## 29. Definition of Done for MVP

The MVP is done when:

- The app is deployed on Vercel.
- Supabase Auth works.
- User can log in and view the private dashboard.
- Supabase database contains areas, workspaces, projects, tasks, resources, inbox items, brain dump items, time entries, and reports data.
- Command Center uses real data.
- Board uses real tasks.
- Projects uses real projects.
- Task Detail and Project Detail work.
- Inbox review workflow works.
- Brain Dump capture and conversion work.
- Resources page works.
- Time entries appear in reports.
- Weekly Report includes KPI cards, time allocation, project investment, Weekly Win Log, summary, and momentum score.
- Archive shows prior weekly summaries.
- RLS is enabled.
- Ingestion endpoints are protected.
- No “billable” language appears anywhere.
- The app feels like LIVAL OS, not a generic task manager.

---

## 30. Implementation Notes

Build the app in slices. Do not attempt all pages and all backend behavior at once.

Recommended order:

```text
1. Auth + shell
2. Database + seed data
3. Command Center
4. Board
5. Projects + Project Detail
6. Task Detail
7. Inbox
8. Brain Dump
9. Resources
10. Time entries
11. Reports
12. Archive
13. Ingestion endpoints
14. External hooks
```

The first production version should prioritize stability, clarity, and data model correctness over fancy animation or complex automation.

The design prototype already defines the experience. The production app’s job is to make that experience persistent, secure, and extensible.

---

## 31. Official References

Use the latest official docs while implementing:

- Supabase Next.js quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- Supabase SSR client setup: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase Auth with Next.js: https://supabase.com/docs/guides/auth/quickstarts/nextjs
- Next.js App Router docs: https://nextjs.org/docs/app
- Next.js data fetching docs: https://nextjs.org/docs/app/getting-started/fetching-data
- shadcn/ui Next.js installation: https://ui.shadcn.com/docs/installation/next
- Vercel GitHub deployments: https://vercel.com/docs/git/vercel-for-github
- Vercel environment variables: https://vercel.com/docs/environment-variables
