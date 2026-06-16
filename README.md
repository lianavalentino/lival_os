# LIVAL OS

Private personal operating system web app for daily orientation, capture, project visibility, and weekly accomplishment evidence.

## Local Development

```bash
npm install
npm run dev
```

The app runs in explicit local demo mode when Supabase environment variables are absent. Demo data persists in versioned `localStorage`, and Settings includes a reset action.

## Supabase Setup

Project name: `LIVAL_OS` · ref: `mfcdzgkhmzppfctdzhwy`

**Status: migration applied, credentials in `.env.local`.**

1. Migration `supabase/migrations/001_lival_os_initial_schema.sql` already applied to the project.
2. Enable email auth: Supabase dashboard → Authentication → Providers → Email.
3. `.env.local` already configured with URL and anon key.

To set up from scratch on a new machine:
- Copy `.env.example` to `.env.local` and fill in URL + anon key from dashboard → Settings → API Keys → Legacy.
- Re-apply the migration via the SQL editor.

Do not commit `.env.local`, service-role keys, or database passwords.

When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present, the app shows an email/password auth screen, restores sessions on reload, creates/updates the signed-in profile, bootstraps starter data once for the user, and reads/writes through Supabase with RLS. When they are absent, the same UI uses demo persistence only.

## MVP Coverage

- Command Center with Today's Top 3, inbox overview, weekly progress, time tracking, board preview, quick stats, active projects, sidebar quick capture, and weekly time.
- Daily Planner, Weekly Planner, Board, Projects, Project Detail, Task Detail, Inbox, Brain Dump, Resources, Reports, Archive, and Settings.
- Manual quick capture for tasks, inbox items, and brain dumps.
- Email/password Supabase auth, remote persistence, first-user bootstrap, and local demo fallback.
- Supabase schema for profiles, areas, workspaces, projects, tasks, time entries, inbox items, brain dumps, resources, weekly snapshots, and activity events.
- Row Level Security policies for single-user private data ownership.

## Automation-Ready Tables

- Gmail, n8n, and browser/share captures can insert into `inbox_items`.
- Siri Shortcuts can insert into `brain_dumps`.
- Codex and Claude Code time capture can insert into `time_entries`.
- Weekly evidence is derived from `tasks`, `time_entries`, `brain_dumps`, `resources`, and `activity_events`.
