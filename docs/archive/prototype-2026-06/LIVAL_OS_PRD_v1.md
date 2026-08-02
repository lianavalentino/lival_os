# LIVAL OS — Product Requirements Document

**Product:** LIVAL OS — Personal Operating System
**Version:** PRD v1.0
**Owner:** Liana
**Date:** June 2026
**Status:** Draft — Frontend prototype complete, backend integration in design

---

## 1. Summary

LIVAL OS is a private, ADHD-friendly personal operating system that consolidates a freelance consultant's daily planning, project tracking, time visibility, idea capture, and weekly accomplishment evidence into a single Claude Cowork live artifact.

Unlike traditional productivity apps, LIVAL OS is **automation-first**: most of its content is written by background systems (Claude Code time tracking, Gmail-to-inbox processing, Brain Dump capture endpoints) so the user spends almost no time on manual maintenance. The interface exists to make that automated state visible, reviewable, and motivating.

The product exists to solve a specific personal problem: an AI consultant who recently left a corporate role is now juggling multiple clients, build projects, and an active job search simultaneously. The combination of context-switching, ADHD, and the loss of a corporate planning structure has made it hard to remember what's in flight, see evidence of progress, and feel in control.

---

## 2. Problem Statement

### 2.1 The user's situation

The user is a solo AI automation consultant currently:

- Managing three active consulting clients (ETD, Bistro, Emergent)
- Building multiple personal AI agents (Auto Job Apply Agent, Personal Trainer Agent, Home Assistant integrations)
- Actively job searching for senior data science roles
- Handling life admin (appointments, travel, finances) without the structure a full-time job provided
- Living with ADHD, which compounds context-switching costs across all of the above

### 2.2 The pain

1. **No single source of truth.** Tasks, ideas, and resources live across email, Notion, Claude conversations, sticky notes, and memory. Nothing knows about everything.
2. **High maintenance cost on existing tools.** Tools like Jira, Notion, and Asana require constant manual upkeep. The friction is greater than the value when the user has limited executive function to spare.
3. **Loss of momentum visibility.** Without a manager or team, there is no external mirror confirming that progress is being made. Unemployment + consulting magnifies this — the work happens, but the user can't see it.
4. **Idea loss.** Ideas that arrive between tasks ("agent that auto-applies to jobs", "build travel points dashboard") evaporate without a frictionless capture point.
5. **Inability to bill confidently.** Consulting hours are inconsistently tracked, making invoicing both stressful and inaccurate.

### 2.3 What success looks like

The user opens LIVAL OS in the morning and sees, without clicking: today's top three priorities, what needs review, how much time was tracked across projects, and a calm visual sense that things are under control. On Sunday evenings, the system shows them what they actually accomplished that week — concrete evidence to counter the feeling of "nothing is happening."

---

## 3. Goals and Non-Goals

### 3.1 Goals

- **G1.** Reduce daily planning friction so the user can decide what to work on in under 60 seconds.
- **G2.** Make time tracking automatic for coding work via Claude Code integration so consulting hours are accurate without manual logging.
- **G3.** Provide motivating weekly evidence of progress (Win Log, Momentum Score, hours by project) to combat the morale dip of unemployment + solo work.
- **G4.** Capture ideas frictionlessly from anywhere (desktop, iPhone, Siri) so nothing is lost between sessions.
- **G5.** Centralize project status across consulting, personal builds, job search, and home ops into one calm dashboard.
- **G6.** Auto-route incoming items (client emails, appointments, brain dumps, resources) into a reviewable Inbox rather than scattering them across tools.

### 3.2 Non-goals

- **NG1.** Not a multi-user product. LIVAL OS is private to one person.
- **NG2.** Not a billing or invoicing system. It surfaces tracked hours; invoice generation lives elsewhere.
- **NG3.** Not a corporate Jira replacement. No sprint planning, no story points, no team assignment.
- **NG4.** Not a generic productivity app marketed to others. Design choices favor the specific user's brain over universal usability.
- **NG5.** Not a Pomodoro / focus timer. Manual start/stop timers are explicitly removed in V4.1.
- **NG6.** Not mobile-first. The desktop Cowork artifact is the primary experience; mobile is for capture only.

---

## 4. Target User

### 4.1 Persona

**The Solo Consultant with ADHD**

- Recently transitioned from corporate data science to independent AI consulting
- Holds advanced technical skills (Python, ML, Databricks, agents) but limited executive-function bandwidth
- Manages parallel streams: paid client work, portfolio building, job search, life admin
- Has tried Notion, Jira, Asana, Apple Reminders, and abandoned each due to maintenance overhead
- Values calm visual design over feature-rich dashboards
- Highly comfortable with AI tools (Claude Code, ChatGPT, n8n) and willing to integrate them

### 4.2 Why off-the-shelf tools fail this user

Existing PM tools are built for teams, not solo operators. They assume someone else is keeping the data current. For a solo user with ADHD, the maintenance cost exceeds the planning benefit within weeks of adoption. LIVAL OS inverts this: machines maintain the data; the human reviews and acts.

---

## 5. User Stories

### 5.1 Daily flow

- **US1.** *As Liana, I want to open my dashboard in the morning and see exactly three things to focus on today*, so I can start working without spending 20 minutes deciding.
- **US2.** *As Liana, I want appointments and deadlines visible alongside my focus list*, so my plan accounts for the real calendar.
- **US3.** *As Liana, I want to see what arrived in my inbox overnight (client emails, ideas, appointments)* without opening my actual email, so I can decide if anything changes my plan.

### 5.2 Capture

- **US4.** *As Liana, I want to capture an idea from my iPhone in under five seconds*, so ideas don't evaporate while I'm walking the dog.
- **US5.** *As Liana, I want to save a link from a browser into Resources*, so I can find it again when I need it.
- **US6.** *As Liana, I want client emails to auto-route into the LIVAL inbox with a suggested classification*, so I don't lose action items in Gmail.

### 5.3 Time tracking

- **US7.** *As Liana, I want Claude Code sessions to log time automatically to the right project*, so my consulting hours are accurate without me touching a timer.
- **US8.** *As Liana, I want to see total hours by project for the week*, so I know which client is consuming time and can plan invoicing.

### 5.4 Project tracking

- **US9.** *As Liana, I want each project to have a goal, progress, and target date*, so I can see at a glance whether a client engagement is on track.
- **US10.** *As Liana, I want personal build projects (like Auto Job Apply Agent) to live in the same system as client work*, so my whole portfolio is visible.
- **US11.** *As Liana, I want to promote a personal project to its own "Workspace" when it grows large enough*, so the hierarchy can flex with reality.

### 5.5 Reflection

- **US12.** *As Liana, on Sunday evening, I want to see a Weekly Win Log of what I accomplished*, so I have evidence to counter the feeling that nothing is happening.
- **US13.** *As Liana, I want a Momentum Score and trend chart*, so I can spot weeks where I'm declining before they turn into a slump.
- **US14.** *As Liana, I want past weekly snapshots archived*, so I can look back over months of accomplishments.

---

## 6. Functional Requirements

### 6.1 Information architecture

LIVAL OS uses a four-level hierarchy:

```
Area → Workspace → Project → Task
```

| Level | Definition | Examples |
|---|---|---|
| Area | Top-level life domain | Consulting, Build Lab, Job Search, Life Admin, Home Ops, Learning |
| Workspace | Client or sub-domain within an Area | ETD, Bistro, Auto Job Apply Agent, Health, Cameras |
| Project | A bounded body of work with a goal and target date | Enertia ROI Calculator, Website Update, MVP Architecture |
| Task | A discrete action item | Update pricing logic, Apply to 5 roles, Schedule dentist |

Tasks may sit directly under a Workspace for one-offs (Life Admin, Job Search) without requiring a Project layer.

### 6.2 Pages (must-have)

The product comprises 12 pages:

1. **Command Center** — Daily dashboard with Top 3, Inbox overview, Weekly progress donut, Time tracking summary, Board preview, Quick stats
2. **Daily Planner** — Today's Focus (Must Do / Should Do / Could Do), Schedule & Deadlines, Unplanned Items
3. **Weekly Planner** — This Week's Outcomes, Focus Areas, Open Loops, Weekly Calendar
4. **Board** — Full Kanban with columns: Backlog, This Week, In Progress, Blocked, Done. Filterable by Area, Project, Labels, Priority, Due Date
5. **Projects** — Portfolio view of all projects grouped by Area with progress rings and health indicators
6. **Project Detail** — Tabs: Overview, Tasks, Timeline, Time, Resources, Notes, Activity
7. **Task Detail** — Drawer with tabs: Details, Subtasks, Files, Notes, Activity
8. **Inbox** — Review queue for auto-captured items with tabs: All, Emails, Appointments, Ideas, Resources. Actions: Approve, Convert to Task/Project, Save as Resource, Archive
9. **Brain Dump** — Low-pressure idea capture with tabs: All, Ideas, Thoughts, Someday/Maybe, Links
10. **Resources** — Categorized link library (AI / Claude, Databricks, Job Search, Home Assistant, Consulting, Travel, Marketing, Finance, Other)
11. **Reports** — Weekly accomplishment report with tabs: Overview, Trends, Time, Tasks, Projects, Themes. Includes KPIs, Time Allocation donut, Project Investment bars, Weekly Win Log, Weekly Summary, Momentum Score
12. **Archive** — List of completed weekly snapshots

### 6.3 Board statuses

Fixed status set: **Backlog · This Week · In Progress · Blocked · Done**

### 6.4 Priority

Fixed priority set: **High · Medium · Low**. No P0/P1/P2 terminology.

### 6.5 Time tracking

- Displayed on the sidebar (weekly mini-card with M-T-W-T-F-S-S bar chart)
- Displayed on Command Center as project-by-project breakdown
- Displayed on every Project Detail and Task Detail as a per-week bar chart
- Source of truth: Claude Code skill writes time entries to the LIVAL backend (out of scope for V4.1 prototype, design phase next)
- Manual fallback: "Log Time (Code)" sidebar button
- **No "billable" or "non-billable" labels appear anywhere in V4.1**
- **No manual start/stop focus timer**

### 6.6 Quick Capture

The sidebar exposes four capture buttons available from every page:

- + Add Task
- + Brain Dump
- + Add Resource
- ⏱ Log Time (Code)

Each opens a lightweight capture modal. No required fields beyond title.

### 6.7 Top header (global)

- Page title
- Date selector with previous/next navigation
- Global search bar
- Notifications indicator
- Settings entry
- User avatar

### 6.8 Visual design

- Light canvas (#f7f8fb), dark navy sidebar (#171b27), purple primary accent (#7c3aed)
- Rounded cards, subtle borders, minimal shadows
- Color semantics: green = healthy/done, yellow/orange = medium priority/attention, red = high priority/blocked, purple = primary actions and active states, blue = informational/resources/time

---

## 7. Non-Functional Requirements

### 7.1 Performance

- Page transitions under 100 ms in the Cowork artifact
- Full data load (~30 tasks, ~10 projects) on initial render in under 500 ms
- Charts render without layout shift

### 7.2 Reliability

- Frontend gracefully handles missing or partial backend data (e.g., no time data yet for a new project)
- No data loss on Quick Capture even if backend write fails (queued for retry)

### 7.3 Privacy

- LIVAL OS is single-user and private
- No telemetry sent to third parties
- Data lives in the user's chosen backend (TBD — see Section 11)

### 7.4 Accessibility

- WCAG AA color contrast where practical
- All interactive elements keyboard-navigable
- Respects `prefers-reduced-motion`

### 7.5 Calm UX principles

- The interface should never feel busy
- No more than three primary calls-to-action visible on any screen
- Notifications and badges are minimal and meaningful
- Animation is functional, not decorative

---

## 8. Success Metrics

### 8.1 Adoption (first 4 weeks)

- **A1.** User opens LIVAL OS at least 5 days per week
- **A2.** Daily Planner is viewed at least once per workday
- **A3.** Weekly Win Log is reviewed at least once per week

### 8.2 Capture velocity

- **C1.** ≥80% of new ideas are captured in Brain Dump rather than lost or held in memory
- **C2.** ≥90% of client emails are routed to the Inbox automatically (target: Phase 2)
- **C3.** ≥75% of consulting work time is auto-tracked via Claude Code without manual intervention (target: Phase 2)

### 8.3 Confidence indicators (qualitative, self-reported)

- **Q1.** User reports feeling "in control" of their work week (weekly self-check)
- **Q2.** User reports less anxiety about forgetting commitments
- **Q3.** User uses the Weekly Win Log when explaining their work to others (e.g., interviews, networking)

### 8.4 System health

- **S1.** Inbox review queue stays under 20 items
- **S2.** Average task age (Backlog) under 30 days
- **S3.** Weekly tracked hours > 25h (consulting + builds)

---

## 9. Constraints and Assumptions

### 9.1 Technical constraints

- Frontend must render inside a Claude Cowork live artifact (single-page React or HTML)
- Backend persistence not available in V4.1 prototype — uses mock data
- iPhone capture relies on Siri Shortcuts + a webhook endpoint (designed in Phase 2)
- Gmail integration via Gmail MCP or n8n webhook (Phase 2)

### 9.2 Assumptions

- User runs Claude Code locally and is willing to install a time-tracking skill
- User maintains a working Anthropic API key and n8n instance (already true)
- User's email volume is low enough that AI-classified inbox routing is tractable (~30 emails/day)
- User accepts a learning curve in the first two weeks while behavior models calibrate

---

## 10. Out of Scope (V4.1 and earlier phases)

The following are deferred to later phases:

- Notion sync as backing store
- Gmail integration for inbox auto-routing
- Claude Code time-tracking skill (design phase next)
- Siri Shortcut integration for iPhone capture
- Native mobile app
- Focus timer / Pomodoro
- Persistent "Now Working On" bar
- Recent Wins widget on Command Center (intentionally on Reports page instead)
- Multi-user ownership or assignee features
- Billable vs non-billable time labels
- Invoicing / billing exports
- Drag-and-drop between Board columns (visual placeholder OK; backend wiring later)

---

## 11. Open Questions and Risks

### 11.1 Open questions

- **Q1.** Where does data live? Options: (a) Cowork artifact local storage, (b) Notion via MCP, (c) Postgres on n8n, (d) Hybrid (Notion for tasks/projects, file storage for resources). Decision target: end of Phase 1.
- **Q2.** How does Claude Code reliably attribute time to the right project? Folder mapping? Explicit project flag? AI inference from file paths?
- **Q3.** What's the right Sunday review automation? Email summary? Push notification? Or just a Reports tab badge that says "your week is ready"?
- **Q4.** How are graduated personal projects handled in archived data? (When Auto Job Apply Agent moves from Workspace to Area, do historical tasks rewrite their hierarchy?)
- **Q5.** Should the Inbox have a confidence threshold? E.g. items > 90% confidence skip the inbox and land directly in the right project — only ambiguous ones surface for review.

### 11.2 Risks

- **R1. Maintenance creep.** As the system grows, the user may slip back into manual upkeep. Mitigation: every new feature must reduce, not add to, manual work.
- **R2. Automation drift.** If Claude Code time tracking misattributes hours, billing accuracy suffers. Mitigation: weekly review surfaces unusual time allocations for manual correction.
- **R3. Calm UX regression.** Each added widget risks turning LIVAL into another busy dashboard. Mitigation: every new element requires removing or consolidating something else.
- **R4. ADHD-specific motivation gap.** The user may abandon the system during a low-energy week. Mitigation: Weekly Win Log and Momentum Score are designed to pull the user back in even after a gap.

---

## 12. Phases and Milestones

### Phase 1 — Frontend prototype (V4.1 — complete)

- 12-page Claude Cowork artifact with mock data
- All page layouts, navigation, filters, and clickthroughs functional
- Visual design system established (light canvas, dark sidebar, purple accent)
- No backend; data resets on refresh

### Phase 2 — Backend integration

- Choose persistence layer (decision needed)
- Wire Quick Capture buttons to write to the backend
- Implement Inbox auto-routing for Gmail
- Iframe-or-storage strategy for Cowork artifact state survival across sessions
- Migrate from mock data to real data

### Phase 3 — Claude Code time tracking

- Build the Claude Code skill that logs time to the right project
- Hook into the Project Detail Time tab
- Validate auto-attribution accuracy over two weeks of real consulting work

### Phase 4 — Capture endpoints

- Siri Shortcut for iPhone Brain Dump capture
- Siri Shortcut for iPhone Resource capture
- Browser extension or share sheet for desktop resource capture
- Gmail-to-Inbox webhook (via n8n)

### Phase 5 — Reflection automation

- Sunday review draft (Claude Code skill generates next week's plan)
- Momentum Score algorithm
- Weekly summary natural-language generator
- Archive snapshot pipeline

### Phase 6 — Polish and review

- One-month usage review against success metrics
- UX adjustments based on real usage patterns
- Decisions on V5 scope

---

## 13. Acceptance Criteria for V4.1 (Frontend)

The frontend prototype is accepted when:

- All 12 pages render with realistic sample data and navigate correctly
- Command Center matches the approved final mockup structure
- Board displays five columns with filterable cards
- Projects shows portfolio cards grouped by Area with progress rings
- Project Detail and Task Detail render with all specified tabs
- Reports page shows the Weekly Accomplishment Report including Win Log, KPI cards, Time Allocation donut, Project Investment bars, and Momentum Score
- Sidebar Quick Capture buttons render and trigger a placeholder interaction
- No "billable" terminology appears anywhere
- No focus timer is present
- The interface feels calm, visual, and motivating
- Light theme with dark navy sidebar and purple accent is applied consistently

---

## 14. Glossary

- **Area** — Top-level life domain (Consulting, Build Lab, etc.)
- **Workspace** — Client or sub-domain within an Area (ETD, Auto Job Apply Agent)
- **Project** — Bounded body of work with a goal and target date
- **Task** — Discrete action item under a Project or Workspace
- **Cowork** — Anthropic's desktop tool that hosts live artifacts with persistent state
- **Win Log** — Weekly checklist of accomplishments shown on the Reports page
- **Momentum Score** — 0–100 score reflecting weekly throughput and consistency
- **Open Loop** — An unresolved commitment or follow-up tracked on the Weekly Planner
- **Quick Capture** — Sidebar shortcuts for adding tasks, brain dumps, resources, or time entries

---

*End of PRD v1.0*
