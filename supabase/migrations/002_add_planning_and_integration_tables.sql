-- LIVAL OS — Phase 1 PRD alignment: planning + integration tables.
-- Additive only. Does not modify any table defined in
-- 001_lival_os_initial_schema.sql. Reuses the existing
-- public.set_updated_at() trigger function from that migration.

create table public.task_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  update_type text not null default 'note' check (update_type in ('note', 'status_change', 'time_logged', 'file_change', 'system')),
  body text not null,
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
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
  unique (user_id, plan_date)
);

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  outcomes text[] not null default '{}',
  focus_areas text[] not null default '{}',
  open_loops text[] not null default '{}',
  generated_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  automation_name text not null,
  source text,
  status text not null default 'success' check (status in ('success', 'error', 'partial')),
  input_summary text,
  output_summary text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  display_name text,
  status text not null default 'active' check (status in ('active', 'disabled', 'error')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, display_name)
);

create table public.file_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  file_path text not null,
  change_type text check (change_type in ('created', 'modified', 'deleted', 'renamed')),
  repo_path text,
  github_url text,
  summary text,
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index task_updates_task_id_created_idx on public.task_updates (task_id, created_at desc);
create index daily_plans_user_id_plan_date_idx on public.daily_plans (user_id, plan_date);
create index weekly_plans_user_id_week_start_idx on public.weekly_plans (user_id, week_start);
create index automation_runs_user_id_started_idx on public.automation_runs (user_id, started_at desc);
create index file_changes_project_id_idx on public.file_changes (project_id);
create index file_changes_task_id_idx on public.file_changes (task_id);

create trigger daily_plans_set_updated_at before update on public.daily_plans
  for each row execute function public.set_updated_at();
create trigger weekly_plans_set_updated_at before update on public.weekly_plans
  for each row execute function public.set_updated_at();
create trigger integrations_set_updated_at before update on public.integrations
  for each row execute function public.set_updated_at();

alter table public.task_updates enable row level security;
alter table public.daily_plans enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.automation_runs enable row level security;
alter table public.integrations enable row level security;
alter table public.file_changes enable row level security;

create policy task_updates_owner_policy on public.task_updates
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy daily_plans_owner_policy on public.daily_plans
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy weekly_plans_owner_policy on public.weekly_plans
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy automation_runs_owner_policy on public.automation_runs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy integrations_owner_policy on public.integrations
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy file_changes_owner_policy on public.file_changes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
