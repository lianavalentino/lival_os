create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  timezone text not null default 'America/Los_Angeles',
  week_starts_on int not null default 1 check (week_starts_on between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#6d5efc',
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#2563eb',
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete restrict,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null,
  description text,
  goal text,
  status text not null default 'planned' check (status in ('planned', 'active', 'paused', 'blocked', 'completed', 'archived')),
  health text not null default 'on_track' check (health in ('on_track', 'attention', 'at_risk', 'blocked')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  start_date date,
  target_date date,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete restrict,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  parent_task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'backlog' check (status in ('backlog', 'this_week', 'in_progress', 'blocked', 'done')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date date,
  scheduled_for date,
  completed_at timestamptz,
  estimated_minutes int not null default 0 check (estimated_minutes >= 0),
  sort_order int not null default 0,
  labels text[] not null default '{}',
  source text not null default 'manual',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes int not null check (duration_minutes >= 0),
  description text,
  source text not null default 'manual' check (source in ('manual', 'codex', 'claude_code', 'shortcut', 'imported')),
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'note' check (type in ('email', 'appointment', 'idea', 'resource', 'note', 'task', 'other')),
  title text not null,
  body text,
  source text not null default 'manual',
  source_url text,
  suggested_area_id uuid references public.areas(id) on delete set null,
  suggested_workspace_id uuid references public.workspaces(id) on delete set null,
  suggested_project_id uuid references public.projects(id) on delete set null,
  suggested_task_id uuid references public.tasks(id) on delete set null,
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status text not null default 'new' check (status in ('new', 'reviewed', 'converted', 'archived')),
  received_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brain_dumps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  category text not null default 'idea' check (category in ('idea', 'thought', 'someday', 'link', 'other')),
  status text not null default 'captured' check (status in ('captured', 'reviewed', 'converted', 'archived')),
  source text not null default 'manual',
  converted_task_id uuid references public.tasks(id) on delete set null,
  converted_project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  url text,
  description text,
  category text not null default 'Other',
  tags text[] not null default '{}',
  source text not null default 'manual',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  summary text,
  momentum_score int not null default 0 check (momentum_score between 0 and 100),
  tasks_completed int not null default 0 check (tasks_completed >= 0),
  hours_tracked numeric(8,2) not null default 0 check (hours_tracked >= 0),
  projects_advanced int not null default 0 check (projects_advanced >= 0),
  ideas_captured int not null default 0 check (ideas_captured >= 0),
  snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index areas_user_id_idx on public.areas (user_id);
create index workspaces_user_id_idx on public.workspaces (user_id);
create index workspaces_area_id_idx on public.workspaces (area_id);
create index projects_user_id_status_idx on public.projects (user_id, status);
create index projects_area_id_idx on public.projects (area_id);
create index projects_workspace_id_idx on public.projects (workspace_id);
create index tasks_user_id_status_idx on public.tasks (user_id, status);
create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_workspace_id_idx on public.tasks (workspace_id);
create index tasks_due_date_idx on public.tasks (user_id, due_date) where due_date is not null;
create index time_entries_user_started_idx on public.time_entries (user_id, started_at desc);
create index time_entries_project_id_idx on public.time_entries (project_id);
create index time_entries_task_id_idx on public.time_entries (task_id);
create index inbox_items_user_status_idx on public.inbox_items (user_id, status, received_at desc);
create index brain_dumps_user_status_idx on public.brain_dumps (user_id, status);
create index resources_user_category_idx on public.resources (user_id, category);
create index weekly_snapshots_user_week_idx on public.weekly_snapshots (user_id, week_start desc);
create index activity_events_user_created_idx on public.activity_events (user_id, created_at desc);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger areas_set_updated_at before update on public.areas
  for each row execute function public.set_updated_at();
create trigger workspaces_set_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger time_entries_set_updated_at before update on public.time_entries
  for each row execute function public.set_updated_at();
create trigger inbox_items_set_updated_at before update on public.inbox_items
  for each row execute function public.set_updated_at();
create trigger brain_dumps_set_updated_at before update on public.brain_dumps
  for each row execute function public.set_updated_at();
create trigger resources_set_updated_at before update on public.resources
  for each row execute function public.set_updated_at();
create trigger weekly_snapshots_set_updated_at before update on public.weekly_snapshots
  for each row execute function public.set_updated_at();
create trigger activity_events_set_updated_at before update on public.activity_events
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.workspaces enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.time_entries enable row level security;
alter table public.inbox_items enable row level security;
alter table public.brain_dumps enable row level security;
alter table public.resources enable row level security;
alter table public.weekly_snapshots enable row level security;
alter table public.activity_events enable row level security;

create policy profiles_owner_policy on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy areas_owner_policy on public.areas
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy workspaces_owner_policy on public.workspaces
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy projects_owner_policy on public.projects
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy tasks_owner_policy on public.tasks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy time_entries_owner_policy on public.time_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy inbox_items_owner_policy on public.inbox_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy brain_dumps_owner_policy on public.brain_dumps
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy resources_owner_policy on public.resources
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy weekly_snapshots_owner_policy on public.weekly_snapshots
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy activity_events_select_policy on public.activity_events
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy activity_events_insert_policy on public.activity_events
  for insert to authenticated
  with check (user_id = (select auth.uid()));
