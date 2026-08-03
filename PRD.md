# LIVAL OS — Product Requirements Document

**Product:** LIVAL OS — a private personal operating system for one person with ADHD
**Version:** 2.0 (canonical)
**Owner:** Liana
**Date:** 2026-08-02
**Status:** Active — app built and running locally, not yet deployed
**Supersedes:** `LIVAL_OS_Codex_PRD_v1.md`, `docs/LIVAL_OS_Frontend_Artifact_Spec_V4_1.md`, and everything in `docs/archive/`

---

## 0. How to read this document

This is the only PRD. Three earlier ones disagreed with each other and with the running
code; they are archived and marked historical. Where this document and any other document
conflict, **this one wins** — with two exceptions, both narrow and deliberate:

| Document | Authority |
|---|---|
| `CLAUDE.md` (repo root) | Current build state, env vars, gotchas. Changes faster than this PRD. |
| `docs/ingestion/README.md` | Endpoint contracts. The most accurate doc in the repo; not duplicated here. |
| `docs/superpowers/specs/` + `plans/` | A dated, immutable decision log. Historical by design — never edit them to match this. |
| `docs/decisions/2026-08-02-scope-reset.md` | The reasoning behind §3, §6, §7, §11 and §17. This PRD states the decisions; that document states why. |

Sections 17 (Open Work) and 18 (Out of Scope) are the operational half of this document.
`docs/superpowers/kanban.html` is generated from §17 one-to-one.

---

## 1. Summary

LIVAL OS is a private, single-user web app that holds the working state of one person's
life: consulting delivery, a consulting business, personal builds, a job search, and life
admin. It exists to reduce the distance between having a thought and having that thought
recorded somewhere that will resurface it.

The product is **automation-fed, manually reviewed**. Most rows are written by background
systems — Claude Code session hooks, an Apple Shortcut, a Friday review job — so the user
spends their limited executive function reviewing and deciding, not maintaining. The
interface exists to make automated state visible, reviewable, and motivating.

**It is a tool that gets used daily. It is not a portfolio piece.** This was the first
decision of the 2026-08-02 scope reset and it governs every other one. Career materials
that described LIVAL OS as an "engineering-depth case study, gated until finished" are
retired. Portfolio value, if it comes, is a byproduct of a tool that works.

The practical consequence: the finish line is *"I open it every morning,"* not *"it's
impressive across all thirteen views."* Every feature is judged on whether it reduces
friction between a thought and a recorded action. Features that only look good lose.

---

## 2. Problem Statement

### 2.1 Situation

The user is a solo AI automation consultant, recently independent, running in parallel:

- Paid client delivery work
- A consulting business entity (Valentino Intelligence LLC — formation, SEA, invoicing, taxes)
- Personal AI build projects
- An active job search for senior data roles
- Life admin without the scaffolding a full-time job used to provide

ADHD compounds the context-switching cost across all five streams simultaneously.

### 2.2 The pain

1. **No single source of truth.** Tasks, ideas, and links live across email, Notion, Claude
   conversations, and memory. Nothing knows about everything.
2. **Maintenance cost exceeds value.** Jira, Notion, and Asana all require constant manual
   upkeep. With limited executive function, the friction wins within weeks and the tool is
   abandoned. This has already happened repeatedly.
3. **No momentum mirror.** Without a manager or team, nothing externally confirms progress
   is being made. Independent work magnifies this — the work happens, but it is invisible.
4. **Idea loss.** Ideas that arrive between tasks evaporate without a frictionless capture
   point. Capture must take under five seconds or it does not happen.
5. **Unbillable-looking time.** Consulting hours tracked inconsistently make invoicing both
   stressful and inaccurate.

### 2.3 The failure mode this product must avoid

This repository went dormant for five weeks (2026-06-25 → 2026-08-02). The cause was not a
technical blocker. It was that opening the tool required `npm run dev` in the right
directory, and that step is enough friction to lose to. **Any design decision that adds a
step between impulse and use is a bug in the product, not a preference.**

### 2.4 What success looks like

The user opens LIVAL OS in the morning and sees, without clicking: today's top three
priorities, what arrived overnight, how much time was tracked, and a calm sense that things
are held. On Friday evening the system shows what actually got done that week — concrete
evidence against the feeling that nothing is happening.

---

## 3. Goals and Non-Goals

### 3.1 Goals

- **G1.** Decide what to work on in under 60 seconds, first thing in the morning.
- **G2.** Capture a thought from anywhere — phone, share sheet, Siri, desktop — in under
  five seconds, with at most one required field.
- **G3.** Track coding time automatically, with no timer to remember to start or stop.
- **G4.** Produce weekly evidence of progress (Win Log, Momentum Score, hours by project)
  without the user assembling it.
- **G5.** Hold consulting, business, builds, job search, and life admin in one place
  without them bleeding into each other.
- **G6.** Reach the app in one tap from a phone home screen or a bookmarked URL.

### 3.2 Non-goals

- **NG1.** Not multi-user. No assignees, no sharing, no permissions beyond "it's mine."
- **NG2.** Not an invoicing system. It surfaces hours; invoices are generated elsewhere.
- **NG3.** Not a Jira replacement. No sprints, story points, or velocity.
- **NG4.** Not a general-audience productivity app. Design favors this specific brain over
  universal usability. That is the point, not a compromise.
- **NG5.** Not a Pomodoro or focus timer. No manual start/stop timers anywhere.
- **NG6.** Not a portfolio artifact. See §1.
- **NG7.** Not desktop-only. Mobile is a first-class capture and review surface, though
  desktop remains the primary planning surface.

---

## 4. Target User

One person: a solo AI consultant and builder with ADHD, technically advanced, with limited
executive-function bandwidth to spend on tool maintenance. Has tried and abandoned Notion,
Jira, Asana, and Apple Reminders. Values calm visual density over feature richness. Runs
Claude Code daily and is willing to wire automations into it.

Design priorities, in order:

1. Fast scanning — information found by looking, not by clicking
2. Minimal required fields — one field to save, always
3. Visible momentum — progress must be legible at a glance
4. Manual correction — every automated guess is editable
5. Keyboard accessibility
6. Mobile capture

**Why off-the-shelf tools fail here:** they are built for teams and assume someone else is
keeping the data current. For a solo user with ADHD, the maintenance cost exceeds the
planning benefit within weeks. LIVAL OS inverts this — machines maintain the data, the
human reviews and acts.

---

## 5. User Stories

Carried forward from the archived PRD v1; the only place these existed. Renumbered where
the 2026-08-02 reset changed them.

### 5.1 Daily flow

- **US1.** Open the dashboard in the morning and see exactly three things to focus on
  today, so work starts without twenty minutes of deciding.
- **US2.** See appointments and deadlines alongside the focus list, so the plan accounts
  for the real week.
- **US3.** See what arrived overnight — captures, ideas, links — without opening email, so
  it's clear whether anything changes the plan.

### 5.2 Capture

- **US4.** Capture an idea from the iPhone in under five seconds, so ideas don't evaporate
  while walking the dog.
- **US5.** Share a link from Safari (or any app) straight into LIVAL from the share sheet,
  so it can be found again in six months.
- **US6.** Have every capture land in one reviewable queue rather than scattering across
  tools, so triage is one place and one habit.

### 5.3 Time tracking

- **US7.** Have Claude Code sessions log time automatically, so consulting hours are
  accurate without touching a timer.
- **US8.** See total hours by project for the week, so it's clear which client is consuming
  time and invoicing is defensible.

### 5.4 Project tracking

- **US9.** Give each project a goal, progress, and target date, so engagement health is
  visible at a glance.
- **US10.** Keep personal builds in the same system as client work, so the whole portfolio
  is visible in one view.
- **US11.** Promote work to its own Workspace when it grows, so the hierarchy flexes with
  reality instead of forcing a reorganization.

### 5.5 Reflection

- **US12.** On Friday evening, see a Weekly Win Log of what actually got done, as evidence
  against the feeling that nothing is happening.
- **US13.** See a Momentum Score and its trend, to spot a declining week before it becomes
  a slump.
- **US14.** Browse past weekly snapshots, to look back over months of accomplishments.

---

## 6. Information Architecture

### 6.1 Hierarchy

Four levels, unchanged:

```text
Area → Workspace → Project → Task
```

| Level | Definition | Examples |
|---|---|---|
| Area | Top-level life domain | Consulting, VI, Personal Projects, Job Search, Life Admin |
| Workspace | Client, initiative, or sub-domain inside an Area | ETD, Emergent, LIVAL OS, Applications, Health |
| Project | Bounded body of work with a goal and target date | ROI Calculator, Website Update, LLC Formation |
| Task | Discrete action item | Update pricing logic, Apply to 5 roles, Schedule dentist |

Tasks may sit directly under a Workspace, or directly under an Area, for one-off work. A
Project layer is never required.

### 6.2 Areas — the five

Reduced from six on 2026-08-02. This is the current, authoritative list:

| Area | Holds | Corresponds to |
|---|---|---|
| **Consulting** | Client delivery work | `~/Developer/clients/` |
| **VI** | Valentino Intelligence — LLC, SEA, invoices, taxes, expenses | `~/Developer/business/` |
| **Personal Projects** | LIVAL OS, road-trip, Home Assistant bridge | `~/Developer/personal/` |
| **Job Search** | Applications, pipeline, interview prep | `career-ops/`, `personal/ai-job-search/` |
| **Life Admin** | Appointments, health, house, bills | — |

Removed: **Build Lab** (→ Personal Projects), **Home Ops** (→ Life Admin), **Learning**
(dropped entirely — it was never used and produced a permanently empty column).

**VI and Consulting are siblings, not nested.** VI is *running the company*; Consulting is
*doing the client work*. Collapsing them makes it impossible to see how much unbilled time
the business itself consumes — which is the number that matters most in the first year.

### 6.3 Workspaces

Workspace stays a real level in the schema and in navigation, but is **optional in the UI**.
Capture never requires choosing one. AI routing fills `suggested_workspace_id` when
confident; the user corrects during Inbox triage if it's wrong.

Rationale: three filing decisions at capture time is exactly where ADHD capture dies. One
required field (title) is the ceiling.

### 6.4 Board statuses

Fixed, five: **Backlog · This Week · In Progress · Blocked · Done**

### 6.5 Priority

Fixed, three: **High · Medium · Low**. No P0/P1/P2 terminology anywhere in the UI.

---

## 7. Application Views

Thirteen view components exist. Ten appear in navigation, two are drill-ins, one is
Settings.

### 7.0 Navigation

The sidebar composition is taken from the archived June prototype
(`docs/archive/prototype-2026-06/lival-os.html`), which the live app never adopted. The
palettes already match; the difference is structural.

```text
Now      ⌘  Command Center
         ☀  Daily
         📅 Weekly
Work     ⬡  Board
         ◈  Projects
         ✉  Inbox
         💡 Brain
Review   ◉  Reports
         🗃  Archive
         ⚙  Settings

Quick Capture
  ＋ Add Task
  ＋ Brain Dump
  ＋ Add Resource
  ⏱ Log Time (Code)

This Week's Time
  34.2h  [M T W T F S S bar chart]
```

Three changes from the current live app:

| | Adopted (prototype) | Replaced (current) |
|---|---|---|
| Nav | Grouped with separators | Flat list |
| Quick Capture | In the sidebar, always visible | Button in the top bar |
| Time | "This Week's Time" card + bar chart, pinned bottom | Top bar only |

`~/Documents/LIVAL_OS/docs/LIVAL_OS_mockup.png` (the "BRAIN OS" mockup) converged on the
same sidebar shape independently. Treat it as a **north star for density and layout, not as
a build checklist** — it draws every unbuilt gap as though finished.

Project Detail and Task Detail are drill-ins reached from Board, Projects, and Command
Center. They are not nav entries.

### 7.1 Command Center

Primary landing screen. The view that has to be worth opening every morning.

Widgets: Today's Top 3 · Inbox Overview · Weekly Progress · Time Tracking This Week ·
Board Preview · Quick Stats.

Desktop shows the full grid. Mobile stacks into cards with bottom navigation.

Board Preview and Weekly Progress read from the same task records as the Board and Weekly
views — this is why Board cannot be cut without punching a hole in Command Center.

### 7.2 Daily

Today's Focus grouped **Must Do / Should Do / Could Do** · Schedule and deadlines ·
Unplanned inbox items · Auto-plan action.

Persists to `daily_plans` (snapshot-then-persist, one row per `(user_id, plan_date)`).

### 7.3 Weekly

This Week's Outcomes · Project priorities · Focus areas · Open loops · **Weekly Calendar**.

Persists to `weekly_plans` (one row per `(user_id, week_start)`).

The Weekly Calendar is a seven-column Mon–Sun grid with colored blocks by Area. It is
currently rendered from hardcoded placeholder text and must be **derived from task due
dates and `daily_plans`** — see §17.

### 7.4 Board

Kanban across all active tasks. Five columns per §6.4.

Filters: Area · Workspace · Project · Label · Priority · Status · Due date. Filters must not
reset when navigating to a task and back.

Drag-and-drop between columns is required and not yet built. Where the archived Gap Audit
called it P0 and the Codex PRD listed it as deferred, **P0 wins** — dragging a card is the
shortest path between doing a thing and recording it.

### 7.5 Projects

Portfolio view grouped by Area. Each card: name · workspace · status/health · progress ·
target date · active task count · time tracked this week.

### 7.6 Project Detail

Tabs, revised from seven to four:

| Tab | Status |
|---|---|
| Overview | **Build** — progress, goal, target date, health |
| Tasks | **Build** — filtered task list for this project |
| Time | **Build** — per-week bar chart from `time_entries` |
| Activity | Later — cheap add off `activity_events` |
| ~~Timeline~~ | **Cut** — needs a hand-maintained milestones table; maintenance-negative |
| ~~Notes~~ | **Cut** — duplicates Brain |
| ~~Resources~~ | Later — cheap add off `resources.project_id` |

### 7.7 Task Detail

Drawer with tabs: Details · Subtasks · Files/links · Notes · Activity.

Must include a **time-tracking widget**: total time, weekly bar chart, and an
"Auto-tracked via Claude Code" note where `time_entries.source = 'claude_code'`. This is the
payoff for every session hook that has been running since June and is currently invisible.

### 7.8 Inbox

Review queue for everything captured. Tabs: All · Emails · Appointments · Ideas · Resources.

Actions: Convert to task · Convert to project · Save as resource · Archive · Mark reviewed.

Every capture path in §11 terminates here. Triage happens here and nowhere else.

### 7.9 Brain

**Brain Dump and Resources are merged into one view.** Icon `💡`, label `Brain`.

Tabs: `All` · `Ideas` · `Someday` · `Saved`.

- `Saved` reads `resources`
- everything else reads `brain_dumps`

**Both tables stay separate.** The lifecycles are opposite: a brain dump succeeds when it
converts to a task and disappears (`converted_task_id`); a resource succeeds when it is
still findable in six months (`archived_at`). One shared `status` column serving both
produces a junk drawer. Both views already used the same `TabbedList` component, so the UI
merge is cheap and the data model is untouched.

This also resolves the "Resources filters/search" gap — it becomes Brain's tab bar.

### 7.10 Reports

Weekly accomplishment report. Sections: tasks completed · hours worked · projects advanced ·
ideas captured · time allocation · project investment · Weekly Win Log · Weekly Summary ·
Momentum Score.

**Reports is not unbuilt — it is unfed.** `ReportsView.tsx` already renders five panels off
live data. It reads `weeklySnapshots[0]` and shows a blank summary and a blank momentum
score because **nothing writes to `weekly_snapshots`**. See §12.

Charts (donut, trend line) are deferred. Real numbers in text panels answer "how was my
week." A Recharts dependency is roughly six hours and answers nothing new.

### 7.11 Archive

List of completed weekly snapshots, newest first. Fed by the same job as Reports.

### 7.12 Settings

Profile, timezone, week-start day, area management, integration status.

---

## 8. Data Model

Supabase Postgres is the **only** system of record. Project ref `mfcdzgkhmzppfctdzhwy`.
Nothing else holds authoritative state — no markdown file, no Google Sheet, no Notion
database.

Seventeen tables across three migrations. Every table has `id`, `user_id`, `created_at`,
RLS enabled, and a single-user policy (`user_id = auth.uid()`).

### 8.1 Core — `001_lival_os_initial_schema.sql`

| Table | Purpose | Notable columns |
|---|---|---|
| `profiles` | Single-user profile and preferences | `email`, `display_name`, `timezone`, `week_starts_on` |
| `areas` | Top-level life domains | `name`, `description`, `color`, `sort_order`, `archived_at` |
| `workspaces` | Clients/initiatives inside an Area | `area_id`, `name`, `color`, `sort_order`, `archived_at` |
| `projects` | Bounded work with a goal | `area_id`, `workspace_id`, `goal`, `status`, `health`, `progress_percent`, `target_date` |
| `tasks` | Discrete action items | `area_id`, `workspace_id`, `project_id`, `parent_task_id`, `status`, `priority`, `due_date`, `scheduled_for`, `estimated_minutes`, `labels`, `source` |
| `time_entries` | Time tracking, mostly automated | `project_id`, `task_id`, `started_at`, `duration_minutes`, `source`, `external_ref` |
| `inbox_items` | Capture review queue | `type`, `source`, `source_url`, `suggested_*_id`, `confidence`, `status`, `received_at` |
| `brain_dumps` | Ideas and someday items | `category`, `status`, `converted_task_id`, `converted_project_id` |
| `resources` | Links and reference material | `url`, `category`, `tags[]`, `area_id`, `workspace_id`, `project_id`, `archived_at` |
| `weekly_snapshots` | Archived weekly report state | `week_start`, `week_end`, `summary`, `momentum_score`, `tasks_completed`, `hours_tracked`, `projects_advanced`, `ideas_captured`, `snapshot_json` |
| `activity_events` | Append-only event log | `entity_type`, `entity_id`, `event_type`, `message`, `metadata` |

Enums:

```text
projects.status     planned | active | paused | blocked | completed | archived
projects.health     on_track | attention | at_risk | blocked
tasks.status        backlog | this_week | in_progress | blocked | done
tasks.priority      high | medium | low
time_entries.source manual | codex | claude_code | shortcut | imported
inbox_items.type    email | appointment | idea | resource | note | task | other
inbox_items.status  new | reviewed | converted | archived
brain_dumps.category  idea | thought | someday | link | other
brain_dumps.status    captured | reviewed | converted | archived
```

`weekly_snapshots` carries `unique (user_id, week_start)` — the weekly review job is
idempotent by construction and can be re-run safely.

### 8.2 Planning and integration — `002_add_planning_and_integration_tables.sql`

| Table | Purpose | Wired? |
|---|---|---|
| `task_updates` | Per-task note/status/time/file/system events | Yes — Task Detail |
| `daily_plans` | One row per day; `must_do` / `should_do` / `could_do` task id arrays | Yes — Daily |
| `weekly_plans` | One row per week; `outcomes[]`, `focus_areas[]`, `open_loops[]` | Yes — Weekly |
| `automation_runs` | Automation execution log with `status`, `input_summary`, `output_summary`, `error_message` | **No** — see §17 |
| `integrations` | Per-provider config and status | **No** |
| `file_changes` | Repo file-change events from Claude Code | Endpoint live, UI unwired |

### 8.3 Constraints — `003_time_entries_external_ref_unique.sql`

Partial unique index on `time_entries (user_id, external_ref)`. This makes
`ingest-time-entry` idempotent, so a session hook that fires twice produces one row.

### 8.4 Seed data — changing

The browser currently seeds structural data. `SupabaseRepository.loadData()` calls
`bootstrapSeedData()` on **every login**, inserting any missing rows from `src/data/seed.ts`.

That file still contains Build Lab, Home Ops, and Learning. After the §6.2 area change this
stops being a security nit and becomes an active bug: migrate the areas, log in, and the
browser writes the old areas straight back.

Target state: **seed lives in Postgres; the browser never writes structural data.** See
§17.

---

## 9. UX and Visual Requirements

The visual system is already built and correct. `docs/LIVAL_OS_Frontend_Artifact_Spec_V4_1.md`
§4–17 remains the **widget-level reference** for layout and per-page composition — consult
it, do not duplicate it, and do not treat its page list as the scope of this PRD.

### 9.1 Palette

Hand-written CSS variables in `src/styles.css`. No Tailwind, no PostCSS, no CSS framework.

```text
--navy    #111936   dark sidebar
--purple  #6d5efc   primary accent, active states
--canvas  #eef3f8   app background
--radius  8px
```

Semantics: green = healthy/done · yellow/orange = medium priority/attention · red = high
priority/blocked · purple = primary actions and active state · blue = informational,
resources, time.

### 9.2 Layout rules

- Sidebar navigation on desktop; bottom navigation on mobile (`BottomNav.tsx` exists)
- Quick Capture reachable from every screen
- Cards are functional containers, not decorative frames
- Stable dimensions — no layout shift on data load
- Forms require the minimum fields to save; title is usually the only one
- Empty states offer exactly one action, never a wall of instructions

### 9.3 Calm UX principles

- The interface should never feel busy
- No more than three primary calls-to-action visible on any screen
- Badges and notifications are minimal and meaningful
- Animation is functional, never decorative
- **Every new element requires removing or consolidating something else**

### 9.4 Accessibility

- WCAG AA color contrast on core text and controls
- All interactive elements keyboard-navigable, with visible focus states
- Semantic headings and landmarks
- Respects `prefers-reduced-motion`
- Never rely on color alone to convey priority or status

---

## 10. Technical Architecture

This section **replaces** Codex PRD §10 wholesale. That section mandated Next.js, Tailwind,
shadcn/ui, Recharts, and `NEXT_PUBLIC_*` env vars — none of which exist here, and the
Next.js port was formally rejected on 2026-06-16 to preserve working code.

### 10.1 Stack

| Layer | Choice |
|---|---|
| Build | Vite 6 |
| UI | React 19 + TypeScript |
| Styling | Hand-written CSS variables in `src/styles.css` — no framework |
| Data + auth | Supabase (Postgres + Auth), `@supabase/supabase-js` v2.50+ |
| Icons | lucide-react |
| Dates | date-fns |
| Edge functions | Deno, deployed via Supabase CLI |
| Hosting | **Vercel** (Hobby) |
| Package manager | npm |

### 10.2 File map

```text
src/
  App.tsx                    App (repo selection) + LivalShell (layout), 419 lines
  types.ts                   All TypeScript types
  styles.css                 CSS variables and every style rule
  lib/
    supabase.ts              Client construction; exports hasSupabaseConfig
    repository.ts            LocalDemoRepository + SupabaseRepository
    storage.ts               localStorage layer for demo mode
    metrics.ts               Pure derivations over AppData
    view-helpers.ts          Shared view-layer helpers
  data/seed.ts               First-run seed data (being retired — see §8.4)
  components/
    Sidebar.tsx  TopBar.tsx  BottomNav.tsx  CapturePanel.tsx
    AuthGate.tsx  LoadingScreen.tsx
    ui/primitives.tsx
    views/                   13 view components
supabase/
  migrations/                001, 002, 003
  functions/                 4 Deno edge functions + _shared
docs/
  ingestion/README.md        Endpoint contracts — authoritative
  superpowers/               specs/ plans/ kanban.html
  decisions/                 Dated decision records
  archive/                   Retired documents; read the READMEs first
```

### 10.3 Environment

`.env.local`, never committed:

```text
VITE_SUPABASE_URL=https://mfcdzgkhmzppfctdzhwy.supabase.co
VITE_SUPABASE_ANON_KEY=<legacy anon JWT — dashboard → Settings → API Keys → Legacy>
```

With both absent the app falls back to local demo mode (localStorage, no auth). The anon key
must be the **legacy JWT format**, not `sb_publishable_...`, with the current supabase-js
version.

### 10.4 Deployment

**Vercel Hobby.** A tool that needs `npm run dev` before you can look at it does not get
opened — that is a direct cause of the five-week dormancy (§2.3). A bookmarked URL and a
phone home-screen icon remove the only step between impulse and use.

Mobile work is already paid for: `BottomNav.tsx` exists, `styles.css` carries four media
queries, and mobile screenshots date from June.

Security posture is standard, not a shortcut:

- RLS on all seventeen tables, single-user policies
- Supabase Auth gates every route
- The anon key is designed to be public; RLS is the control
- Service-role key never reaches client code and is never stored in this repo

**Known caveat:** Vercel Hobby terms are non-commercial. Fine for a personal tool. If LIVAL
OS is ever used to track VI client work directly, revisit the plan tier.

### 10.5 Security invariants

- `LIVAL_INGEST_SECRET` lives in `~/.claude/settings.json` env (for hooks) and in Supabase
  function secrets (for functions). **Never in this repo.**
- `.env.local` is never committed. The service-role key is never stored anywhere in the repo.
- Edge functions deploy with `--no-verify-jwt`; the shared bearer is the only gate. Treat it
  as a credential of equal weight to a password.
- The Apple Shortcut carries the bearer secret in plaintext inside the Shortcut. It is
  readable by anyone holding the unlocked phone and syncs via iCloud. **Accepted risk** for
  a single-user personal tool. Do not export or share the Shortcut file.
- Open, tracked, not fixed here: `~/.claude/settings.json` also holds a GitHub personal
  access token in plaintext. Both it and `LIVAL_INGEST_SECRET` should move to a
  keychain-backed source.

---

## 11. Capture and Ingestion

Four Supabase Edge Functions (Deno) accept external writes, authenticated by the shared
bearer `LIVAL_INGEST_SECRET`, running as service-role with `user_id` from `LIVAL_USER_ID`.

**Field-level contracts live in `docs/ingestion/README.md` and are not duplicated here.**

| Endpoint | Target table | Idempotency | Status |
|---|---|---|---|
| `ingest-quick-capture` | `inbox_items` (status `new`) | none | Deployed 2026-06-17 |
| `ingest-time-entry` | `time_entries` | `external_ref` | Deployed 2026-06-17 |
| `ingest-file-change` | `file_changes` | none | Deployed 2026-06-23 |
| `ingest-activity-event` | `activity_events` | none | Deployed 2026-06-23 |

28/28 Deno tests pass. All four are live-verified with 201 inserts.

### 11.1 Producer: Claude Code session hooks — LIVE

`~/.claude/hooks/lival-session-{start,end}.sh`. `SessionStart` records a start timestamp
keyed by session id; `SessionEnd` computes elapsed minutes and POSTs to `ingest-time-entry`
with `external_ref = session_id`.

These are **global** hooks in `~/.claude/settings.json`, not repo-local. They are keyed to
the Supabase URL, contain no filesystem paths, and survived the repo move on 2026-08-02
without modification.

> **Do not "clean up" these hooks.** They look like prototype leftovers by name. They are
> live plumbing for this app.

Caveat, documented: a `~/.zshrc` export of the secret only reaches hooks when Claude Code is
launched from a terminal. GUI launches do not source `~/.zshrc`, the hook sees an empty
secret, and the POST silently 401s. The secret must therefore live in `settings.json` under
`env`.

### 11.2 Producer: Apple Shortcut — the primary capture path

One Shortcut, three entry points:

1. **Home screen icon** — one tap from the lock screen
2. **"Hey Siri, capture"** — hands-free, works while walking
3. **Share sheet** — accepts URLs, selected text, and Safari web pages from any app

Two actions: `Ask for Input` → `Get Contents of URL`, POSTing to `ingest-quick-capture`. An
If block uses `Shortcut Input` when the Shortcut is invoked from the share sheet and falls
back to `Ask for Input` otherwise.

Field mapping:

| Shared content | `type` | `source_url` |
|---|---|---|
| A link | `resource` | the URL |
| Selected text | `note` | — |
| Typed input | `idea` | — |

No middleware, no polling, no monthly bill, roughly twenty minutes to set up. Everything
enters through the one endpoint into `inbox_items`; triage happens in Inbox; links promote
into Brain → Saved.

### 11.3 Producer: Notion — deferred, one database

One Notion capture database survives, for when a browsable phone-side queue is wanted.
Direction is **inverted** from the retired prototype: Notion is a capture *source* read
*from*, never a mirror written *to*.

Transport, when built: **Supabase `pg_cron` + `pg_net` calling an edge function poller**,
roughly four hours.

**n8n is rejected outright** as the transport for this. It adds a service to keep alive for
a job that Postgres can schedule natively.

Revisit after two weeks of Shortcut-only capture. If the Shortcut covers it, this never gets
built.

Full design: `docs/superpowers/specs/2026-08-02-notion-capture-poller-design.md`. Two things
in it are worth knowing before the review, because they change what "four hours" buys:

- `inbox_items` has **no idempotency key**, so a poller duplicates Inbox rows on any retry.
  The fix is an `external_ref` column and partial unique index mirroring migration 003, plus
  upsert support in `ingest-quick-capture`. That closes a real hole in the endpoint whether
  or not the poller ships.
- Routing is a Notion `Area` select mapped to `suggested_area_id`, **not** a Claude call. One
  tap beats a guess, and it keeps `ANTHROPIC_API_KEY` out of Supabase.

### 11.4 Retired producers

The four other Notion databases (Projects, Brain Dump, Inbox, Resources) are prototype
mirrors with no remaining job, along with the `Wins` and `Archive` databases created for the
old weekly review — **seven total, not the five an earlier plan counted.** All are dead once
§12 lands.

The `lival-sync` and `lival-scope` skills were deleted on 2026-08-02. They synced the wrong
direction into the wrong store.

---

## 12. Weekly Review Automation

Two scheduled jobs were found still live on disk on 2026-08-02, both pointing at the retired
architecture.

### 12.1 `lival-sync-daily` (8am) — DELETE

Runs `~/Developer/.claude/skills/lival-sync/scripts/rollup.py` and scans
`command-center-work-os/TASKS.md`. Both were deleted. It syncs files → Notion: wrong
direction, wrong store, missing script. **It has been failing every morning since.** Nothing
to salvage.

### 12.2 `lival-weekly-review-friday` (Fri 5pm) — PORT to Supabase

Keeps its schedule and its math; swaps Notion reads and writes for Supabase.

**This job is the Reports feature.** `weekly_snapshots` was built for exactly its output
shape, and nothing writes to it — which is why Reports renders a blank summary.

| The job already computes | Lands in |
|---|---|
| `round(closed / planned * 100)`, Backlog excluded | `weekly_snapshots.momentum_score` |
| One row per completed task | `activity_events` → Weekly Win Log |
| Tasks closed, tasks planned, hours, top area | `weekly_snapshots` — columns already exist |
| Week-keyed idempotent upsert | `unique (user_id, week_start)` — already enforced |

Status mapping is 1:1 and fully mechanical against the existing `tasks.status` enum:

```text
momentum = round(done / (this_week + in_progress + blocked + done) * 100)
```

Deterministic and unit-checked in `compute_review.py` (3 closed / 6 planned → 50). Porting
it also closes the dead `momentumScore` field (`src/types.ts:144`, seeded to a fake 78) that
has never been computed.

**One required change:** the job's hardcoded five-area list must become a database query. It
was already missing Learning, and after §6.2 it is wrong in a different way.

Estimated at two hours. It makes Reports, Archive, and Momentum Score all real at once.

### 12.3 Automation logging

Every scheduled run should write to `automation_runs` (`automation_name`, `status`,
`input_summary`, `output_summary`, `error_message`). The table exists and is unwired — which
is precisely why `lival-sync-daily` could fail silently for six weeks.

---

## 13. Core Workflows

### 13.1 Morning orientation

1. Open the bookmarked URL or tap the home-screen icon
2. Command Center loads Top 3, inbox count, weekly progress, time summary, board preview
3. Review what arrived overnight
4. Open Daily, or start straight from a top task

### 13.2 Capture from anywhere

1. Tap the home-screen Shortcut, say "Hey Siri, capture", or share from any app
2. Type or share; one field
3. POST to `ingest-quick-capture` → `inbox_items` with status `new`
4. Item appears in Inbox on the next load

### 13.3 Triage

1. Open Inbox
2. For each item: convert to task, convert to project, save as resource, or archive
3. Accept or correct the routing suggestion (`suggested_area_id`, `confidence`)
4. Activity event recorded

### 13.4 Doing the work

1. Move a card on the Board, or check a task off in Daily
2. Command Center, Weekly, and Reports all update from the same task records
3. Claude Code sessions log their own time with no user action

### 13.5 Friday review

1. 5pm Friday, the job runs and writes one `weekly_snapshots` row plus `activity_events`
2. Reports renders it: tasks closed, hours, momentum, win log, summary
3. Archive gains the week
4. The user reads it. This is the only step that requires a human.

---

## 14. Non-Functional Requirements

### 14.1 Performance

- View transitions under 100 ms
- Full data load (~30 tasks, ~10 projects) rendered in under 500 ms
- No layout shift on data arrival

### 14.2 Reliability

- The frontend degrades gracefully on missing or partial data — a project with no time
  entries renders an empty state, never an error
- No data loss on Quick Capture if a backend write fails
- Scheduled jobs log success and failure to `automation_runs` (§12.3). **A silent failure is
  a P1 defect** — six weeks of one is what made this section necessary.

### 14.3 Privacy

- Single-user and private
- No telemetry, no analytics, no tracking pixels, no ad services
- All data in the user's own Supabase project
- Every route requires login; RLS enforces ownership at the database

### 14.4 Accessibility

Per §9.4.

---

## 15. Success Metrics

### 15.1 Adoption — the metrics that matter

- **A1.** Opened at least 5 days per week
- **A2.** Command Center viewed at least once per workday
- **A3.** Weekly Win Log read at least once per week

**A1 is the product's only real success metric.** Everything else is diagnostic. A dormant
LIVAL OS has failed regardless of how complete it is.

### 15.2 Capture velocity

- **C1.** ≥80% of new ideas captured in LIVAL rather than lost or held in memory
- **C2.** Capture completes in under 10 seconds from a locked phone
- **C3.** ≥75% of coding time auto-tracked with no manual intervention

### 15.3 System health

- **S1.** Inbox queue stays under 20 items
- **S2.** Average Backlog task age under 30 days
- **S3.** Zero silently-failing scheduled jobs

### 15.4 Confidence (qualitative, self-reported)

- **Q1.** Feels "in control" of the work week
- **Q2.** Less anxiety about forgetting commitments
- **Q3.** Uses the Weekly Win Log when explaining work to others — interviews, networking,
  client conversations

---

## 16. Risks

- **R1. Maintenance creep.** As the system grows, the user slips back into manual upkeep.
  *Mitigation:* every new feature must reduce, not add to, manual work. A feature that needs
  hand-maintained data (the cut Timeline tab) is rejected on those grounds.
- **R2. Automation drift.** Claude Code misattributes hours; invoicing accuracy suffers.
  *Mitigation:* the weekly review surfaces unusual time allocations for manual correction.
- **R3. Calm UX regression.** Each added widget risks turning LIVAL into another busy
  dashboard. *Mitigation:* §9.3 — every new element requires removing or consolidating
  something else.
- **R4. Motivation gap.** The system gets abandoned during a low-energy week.
  *Mitigation:* Win Log and Momentum Score are designed to pull the user back after a gap.
  **This risk already materialized once** — five weeks dormant — and the response is §10.4
  (deploy) and §11.2 (one-tap capture), not more features.
- **R5. Silent automation failure.** A scheduled job breaks and nothing says so.
  *Already materialized:* `lival-sync-daily` failed every morning for six weeks undetected.
  *Mitigation:* §12.3 — `automation_runs` logging is a requirement, not a nice-to-have.

---

## 17. Open Work

This section is the source for `docs/superpowers/kanban.html`. Nothing goes on the board
that is not here.

### 17.1 Ship line — stop building, start using

All four true:

1. Deployed to Vercel and loads on the phone
2. Capture Shortcut on the home screen and in the share sheet
3. Command Center shows today's real tasks and this week's real hours
4. Friday 5pm review runs and fills Reports

**Estimate: ~3 days of focused work.** Everything in §17.3 ships *after* daily use starts.

### 17.2 Ship-line work

| # | Task | Est |
|---|---|---|
| 1 | Deploy to Vercel; set `VITE_*` env vars; verify auth and mobile load | 2h |
| 2 | Build the Apple Shortcut — home screen, Siri, share sheet, If-block on `Shortcut Input` | 30m |
| 3 | `004_reset_areas.sql` — insert the 5 areas of §6.2, remap Build Lab → Personal Projects, Home Ops → Life Admin, drop Learning | 1h |
| 4 | Strip `bootstrapSeedData()` and `deleteDuplicateSeedRows()` from `repository.ts`; seed lives in Postgres | 1h |
| 5 | Port `lival-weekly-review-friday` to Supabase; replace the hardcoded area list with a query | 2h |
| 6 | Delete `lival-sync-daily` | 5m |
| 7 | Recompose the sidebar per §7.0 — grouped nav, inline Quick Capture, This Week's Time card | 3h |
| 8 | Merge Brain Dump + Resources into the Brain view with four tabs | 2h |

Tasks 3 and 4 must land together. Migrating areas without stripping the bootstrap means the
browser writes the old areas back on the next login.

### 17.3 After the ship line

| # | Task | Est |
|---|---|---|
| 9 | Board drag-and-drop with persistence | 4h |
| 10 | Task Detail time-tracking widget — total, weekly bars, auto-tracked note | 2h |
| 11 | Weekly Calendar derived from task due dates + `daily_plans`, colored by Area | 5h |
| 12 | Project Detail — Overview, Tasks, Time tabs | 4h |
| 13 | `automation_runs` logging on every scheduled job | 2h |
| 14 | Rebuild `kanban.html` from this section; fix the Phase 3 header (`status: 'progress'` over 11/11 done) | 1h |

### 17.4 Known board defects

- `docs/superpowers/kanban.html` shows Phase 3 as `status: 'progress'` despite 11/11 done
- The board has zero cards for anything in §17.2 or §17.3
- Board state persists in browser `localStorage` keyed by task id — **changing task ids
  resets all state**

### 17.5 Open, deliberately undecided

- **Google Calendar integration.** The derived Weekly Calendar answers "what did I plan to
  work on." A calendar integration answers "what did I commit to other people" — a different
  question. Revisit after the derived version is in use.
- **Notion poller.** Revisit after two weeks of Shortcut-only capture (§11.3). Designed and
  costed at ~4h in `docs/superpowers/specs/2026-08-02-notion-capture-poller-design.md`; the
  review is a go/no-go, not a design session.
- **Reports charts.** Revisit once the weekly review is actually feeding data (§7.10).
- **Credential rotation.** Plaintext GitHub PAT and `LIVAL_INGEST_SECRET` in
  `~/.claude/settings.json` need a keychain-backed source. Tracked, out of scope here.

---

## 18. Out of Scope

Not building, with the reason:

| Item | Why |
|---|---|
| Multi-user, assignees, sharing | NG1 — single user by design |
| Invoicing and billing exports | NG2 — surfaces hours, does not bill |
| Billable / non-billable labels | Adds a required decision per time entry |
| Focus timer / Pomodoro | NG5 — a timer you must remember to start is not automatic |
| Persistent "Now Working On" bar | Rejected in V4.1, not revived |
| Native mobile app | Responsive web plus the Shortcut covers it |
| Next.js / Tailwind / shadcn / Recharts | Formally rejected 2026-06-16; the SPA works |
| n8n for Notion capture | §11.3 — `pg_cron` does it without another service |
| Project Detail Timeline tab | Needs a hand-maintained milestones table; violates R1 |
| Project Detail Notes tab | Duplicates Brain |
| Notion as a mirror or source of truth | Direction inverted; Supabase only |
| Google Sheets backing store | Predates Supabase; archived |

---

## 19. Document Map

### Canonical — read these

| File | Holds |
|---|---|
| `PRD.md` | This document. Product, scope, open work. |
| `CLAUDE.md` | Build state, env, gotchas. Faster-moving than this. |
| `docs/ingestion/README.md` | Endpoint contracts, producer setup. |
| `docs/decisions/` | Dated decision records with reasoning. |
| `docs/superpowers/kanban.html` | Generated from §17. |
| `docs/superpowers/specs/2026-08-02-notion-capture-poller-design.md` | The Notion poller design. Current, not historical — build gated on §11.3. |

### Reference — consult, do not duplicate

| File | Holds |
|---|---|
| `docs/LIVAL_OS_Frontend_Artifact_Spec_V4_1.md` §4–17 | Widget-level page composition |

### Historical — immutable, never edited to match

| Path | What |
|---|---|
| `docs/superpowers/specs/` — the 6 carrying HISTORICAL banners | Design docs, dated. A decision log — that *is* their value. The 2026-08-02 poller design above is **not** one of them; do not banner it. |
| `docs/superpowers/plans/` (7) | Implementation plans, dated. |
| `docs/archive/prototype-2026-06/` | The retired `TASKS.md` → Notion → HTML pipeline, plus PRD v1 and the June prototype. |
| `docs/archive/superseded-nextjs/` | The rejected Next.js/Tailwind/Vercel/Sheets guidance, including the former `docs/CLAUDE.md`, which carried the wrong secret name. |
| `docs/archive/superseded-prds/LIVAL_OS_Codex_PRD_v1.md` | Superseded by this document. Archived 2026-08-02; that folder's README names its three actively-wrong sections. |

---

## 20. Glossary

- **Area** — Top-level life domain. Five of them; see §6.2.
- **VI** — Valentino Intelligence LLC. The consulting business entity, as distinct from the
  consulting work itself.
- **Workspace** — Client, initiative, or sub-domain inside an Area. Optional at capture time.
- **Project** — Bounded body of work with a goal and a target date.
- **Task** — Discrete action item, under a Project, a Workspace, or an Area.
- **Inbox Item** — Anything captured, awaiting triage.
- **Brain Dump** — Low-pressure capture: ideas, thoughts, someday items.
- **Resource** — A saved link or reference, valued by still being findable later.
- **Brain** — The merged view over brain dumps and resources.
- **Weekly Snapshot** — One archived week of report state.
- **Win Log** — The week's completed work, derived from `activity_events`.
- **Momentum Score** — `round(done / planned * 100)`, Backlog excluded. 0–100.
- **Open Loop** — An unresolved commitment tracked on the Weekly view.
- **Quick Capture** — The sidebar's four always-available add actions.
- **Ship line** — §17.1. The point at which building stops and using starts.

---

*Canonical as of 2026-08-02. Supersedes all prior LIVAL OS PRDs.*
