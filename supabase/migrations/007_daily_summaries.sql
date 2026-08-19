create table public.daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  summary_date date not null,
  project text not null,
  summary text not null,
  hours numeric(5,2),
  external_ref text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index daily_summaries_user_external_ref_uniq
  on public.daily_summaries (user_id, external_ref);

alter table public.daily_summaries enable row level security;

create policy daily_summaries_owner_policy on public.daily_summaries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
