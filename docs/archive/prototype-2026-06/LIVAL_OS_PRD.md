# LIVAL OS — Product Requirements Document

**Owner:** Liana
**Status:** Living document — v1.0
**Last updated:** June 15, 2026
**Related docs:** `LIVAL_OS_Handoff.md` (build state), `lival-os.html` (prototype), `daily-command-center` (live artifact)

---

## 1. Summary

LIVAL OS is a single-pane personal command center that unifies everything Liana is working on — paid consulting, personal build projects, an active job search, life admin, and home operations — into one operating system for the day, the week, and the quarter. It replaces the scattered mix of kanban boards, notes apps, calendars, and mental load with a single surface that answers three questions at any moment: *What should I do right now? What's moving? What's stuck?*

The product is intentionally personal — a system of one. It is not a team tool, has no assignees, no billing, and no collaboration surface. Its job is to reduce the cognitive overhead of context-switching across five very different areas of life and to make momentum visible.

---

## 2. Problem & motivation

Liana runs several parallel tracks at once: client consulting work (ETD, Bistro, Emergent), a personal build lab of AI/automation side projects, a job search, plus the ordinary load of life admin and a self-hosted home stack. Each track tends to live in its own tool, which creates three recurring failures:

**Context fragmentation.** Switching from a client deliverable to a side project to a job application means switching tools, each with its own mental model. The cost isn't the click — it's the reload of context every time.

**Invisible momentum.** Effort is real but progress feels uncertain. Without a single rollup of time spent, tasks closed, and projects advanced, it's hard to know whether a week was productive or just busy, and easy to over-invest in one area while another silently stalls.

**Dropped loops.** Ideas, follow-ups, and inbound requests arrive faster than they can be triaged. Without one reliable capture-and-triage path, things fall through — a recruiter email, a half-formed product idea, a blocked dependency waiting on someone else.

LIVAL OS exists to collapse those tracks into one view, make momentum measurable, and give every loose thread a single home.

---

## 3. Goals & non-goals

### Goals

1. **One surface for everything.** Every active task, project, idea, and inbound item is visible and actionable from a single app, segmented by life area rather than by tool.
2. **Answer "what now?" in under five seconds.** The Command Center and Daily Planner should surface the right next actions without the user having to think.
3. **Make momentum measurable.** Time, completed tasks, and project progress roll up into weekly numbers and a momentum score, with history retained for trend.
4. **A reliable capture-and-triage loop.** Anything can be captured in one gesture and triaged later from a single Inbox / Brain Dump flow.
5. **Durable, owned data.** State persists in the user's own Notion workspace — not locked inside the app — so it survives reloads and remains editable outside LIVAL OS.

### Non-goals (explicit, from spec v4.1)

- **No billable / billing labels.** This is not a time-billing or invoicing tool.
- **No assignees or owner fields.** Single-user by design.
- **No focus timers / Pomodoro.** Time is tracked passively (e.g., from Claude Code), not via in-app timers.
- **No team collaboration, sharing, or permissions surface.**
- **No mobile layout in the current generation.** Desktop-first.

These are guardrails, not backlog items. Changing any of them is a deliberate product decision, not a default.

---

## 4. Target user & context

**Primary (and only) user:** Liana — a technically fluent solo operator juggling client work, independent building, and a job search simultaneously. Comfortable with Notion, Claude Code, self-hosted infra (n8n, Home Assistant). Values speed, keyboard-friendliness, and low-ceremony tools. Likely benefits from externalizing working memory (capture-first workflows, visible state).

**Usage context:** Opened many times a day on desktop. Primary moments are the morning plan ("what's my day"), mid-day re-orientation ("what now / what's blocked"), and an end-of-week review ("how did the week go"). The app is a companion to active work, not a destination in itself — so glanceability and fast capture matter more than depth.

---

## 5. The five areas

Everything in LIVAL OS is tagged to exactly one **area**. Areas are the organizing spine of the product and map to how Liana actually thinks about her life.

| Area | What it holds | Accent |
|------|---------------|--------|
| **Client** | Paid client work — ETD, Bistro, Emergent | Blue |
| **Build Lab** | Personal AI / automation projects (Auto Job Apply Agent, Personal Trainer Agent, etc.) | Purple |
| **Job Search** | Applications, resume, LinkedIn, recruiter leads | Amber |
| **Life Admin** | Appointments, travel, errands, finances | Gray |
| **Home Ops** | Self-hosted home stack — Home Assistant, automations, cameras | Green |

Area is the primary filter across the Board, Projects, Reports, and Planners. The product's value proposition — *one surface across very different tracks* — is expressed through this single consistent taxonomy.

---

## 6. Core concepts & data model

LIVAL OS is built on five primary entities, each backed by a Notion database.

### Tasks
The atomic unit of work. Lives in exactly one project and one area.

| Field | Type | Notes |
|-------|------|-------|
| Title | text | |
| Area | select | one of the five areas |
| Project | relation/select | parent project |
| Workspace | text | client/workspace short name (ETD, Bistro…) |
| Priority | select | High / Medium / Low |
| Status | select | Backlog · This Week · In Progress · Blocked · Done This Week |
| Due | date | |
| Time tracked | number (hrs) | passively populated; no in-app timer |
| Labels | multi-select | freeform tags |

**Status lifecycle:** `Backlog → This Week → In Progress → (Blocked) → Done This Week`. "Done This Week" rolls into the weekly report, then archives at week boundary.

### Projects
A container for related tasks with its own progress and health.

| Field | Type | Notes |
|-------|------|-------|
| Name | text | |
| Area | select | |
| Workspace | text | client/workspace |
| Progress % | number | 0–100 |
| Health | select | On Track / Needs Attention / Blocked / Done |
| Time (this week) | number | rollup |
| Target date | date | |

### Brain Dump
Friction-free capture. No obligation to structure on entry.

Fields: Title, Type (Idea / Thought / Someday-Maybe / Link), Date. Items can be promoted to a Task or Project, or archived.

### Inbox
Inbound items awaiting triage — from email, calendar, brain dump, or saved resources.

Fields: From, Subject, Tag (Potential Task / Appointment / Idea / Resource / Job Lead / Action Needed), Time. Each item can be Approved, Converted (to task/project/resource), or Archived.

### Resources
A reference library of links and docs.

Fields: Title, URL, Category, linked Project, Date.

### Supporting data
- **Wins** — short strings rolled into the Weekly Win Log.
- **Archive** — per-week snapshots: tasks closed, hours, momentum score.
- **Time series** — daily hours, used for sidebar/sparkline and time reports.

---

## 7. Surfaces (pages)

LIVAL OS is a 12-page application. Each page has a clear job.

1. **Command Center** — the home dashboard. Today's Top 3, Inbox overview, Weekly Progress ring, Time This Week, Board preview, Quick Stats. Answers "what now / how am I doing" at a glance.
2. **Daily Planner** — today's focus in Must / Should / Could bands, plus appointments, deadlines, and unplanned items pulled forward.
3. **Weekly Planner** — the week's outcomes, focus areas, open loops, and a weekly calendar grid.
4. **Board** — the kanban heart of the app: five status columns with an area / priority / search filter bar and drag-to-move.
5. **Projects** — all projects grouped by area, each with progress, health, time, and target.
6. **Project Detail** — single project: progress ring, info, time tracking, task list, recent activity, tabs (Overview / Tasks / Time / Notes / Activity).
7. **Task Detail / Side Panel** — a task's full record, slides in from the right; status actions (Mark Done, Move Status, Flag Blocked).
8. **Inbox** — triage queue with type tabs and per-item actions.
9. **Brain Dump** — capture stream with type filters and promote-to-task/project actions.
10. **Resources** — categorized reference library with search.
11. **Reports** — the weekly review: KPIs, time allocation, project investment, win log, momentum score, plus Trends / Time / Tasks / Projects / Themes tabs.
12. **Archive** — historical weekly snapshots.

---

## 8. Key user journeys

**Morning plan.** Open → Command Center shows Top 3 and today's deadlines → Daily Planner confirms Must/Should/Could → start work. Target: under 30 seconds to a clear plan.

**Mid-day re-orient.** Return after a context switch → Board, filtered to the current area → see In Progress and Blocked at a glance → pick up or unblock. The area filter is what makes cross-track switching cheap.

**Capture.** A thought/idea/link arrives → one-gesture Quick Capture (sidebar or `Cmd+K`) → lands in Brain Dump/Inbox → triaged later. The point is to never lose a loop and never break flow to file it.

**Triage.** Inbox review → for each item, Approve / Convert / Archive → inbound becomes structured tasks, projects, or resources.

**Weekly review.** End of week → Reports → read the KPIs, time allocation, and momentum score → skim the Win Log → archive the week. Builds the sense that effort added up.

---

## 9. Architecture & persistence

LIVAL OS ships as a **single self-contained HTML application** published as a Cowork live artifact (`daily-command-center`), with source at `lival-os.html`. No framework — vanilla JS + CSS, with Chart.js for the donut/ring charts.

**Persistence (current generation): Notion-backed.** The five entities live in Notion databases in Liana's own workspace. The live artifact reads them on load via `window.cowork.callMcpTool` (Notion read tools) and writes back on mutation (create task, change status, mark done, promote idea) via Notion's create/update tools. This means:

- State survives reloads — the app is no longer in-memory only.
- Data is owned and portable — fully editable in Notion outside LIVAL OS.
- Notion is the single source of truth; the artifact is a fast, opinionated view over it.

**Why Notion over Google Sheets:** the available Google Drive connector can create and read a Sheet but cannot write back at the cell level, so it can't support the add/edit/move operations the product depends on. Notion exposes full create/read/update, and its select-based schema maps cleanly onto statuses, areas, and priorities.

**Design tokens** (carried from v4.1): navy sidebar `#0f172a`, purple primary `#7c3aed`, light canvas `#f8fafc`; semantic green/red/amber/blue for done/blocked/warning/info.

---

## 10. Success metrics

Because this is a system of one, success is measured by sustained personal usage and the behaviors the product is meant to produce, not by growth metrics.

- **Daily active use** — opened and acted on most working days.
- **Capture reliability** — ideas/loops are captured in LIVAL OS rather than lost or scattered (proxy: Brain Dump + Inbox throughput).
- **Triage closure** — Inbox is regularly worked down rather than growing unbounded.
- **Weekly review completion** — the Reports/Archive ritual actually happens each week.
- **Momentum score trend** — stable or rising over a multi-week window.
- **Single-surface adoption** — fewer competing tools in active use for the same five areas.

---

## 11. Roadmap

### Now — v5: Notion-backed persistence
Wire the five entities to live Notion databases; make every interaction durable (modals save, status buttons mutate, drag-and-drop, Inbox/Brain Dump promote actions). This is the leap from prototype to usable system.

### Next
- **Reports build-out** — replace the placeholder Trends / Time / Tasks / Projects / Themes tabs with real charts over historical data.
- **Drag-and-drop kanban** with optimistic UI and write-back.
- **Quick-capture `Cmd+K`** global shortcut.
- **Due-date calendar picker** and working topbar search.
- **Calendar & email surfacing** — pull appointments and actionable email into Inbox (currently out of scope per v4.1; a deliberate future expansion).

### Later
- **AI weekly themes** — generated narrative summarizing the week's shape and suggesting next-week focus.
- **Passive time-tracking sync** from Claude Code into task/project time.
- **Auto-planning** — "Auto Plan" buttons that propose a day/week from priorities, deadlines, and capacity.

---

## 12. Open questions

- **Write cadence vs. rate limits.** How chatty can the artifact be against Notion on each load/mutation before it feels slow or hits limits? May need caching and batched writes.
- **Time-tracking source of truth.** What actually populates task/project hours — manual entry, Claude Code, or both — and how is it reconciled?
- **Week boundary mechanics.** What exactly triggers "Done This Week" → Archive, and how is the momentum score computed?
- **Inbox sources.** When email/calendar surfacing returns, which connectors feed Inbox and how is duplication avoided?
- **Conflict handling.** If Notion is edited directly while the artifact is open, how do we avoid stale writes overwriting fresh edits?
