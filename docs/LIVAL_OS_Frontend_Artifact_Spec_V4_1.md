# LIVAL OS Frontend Artifact Specification

**Artifact name:** LIVAL OS  
**Artifact type:** Claude Cowork live artifact / interactive frontend dashboard  
**Version:** Frontend V4.1 Final  
**Primary purpose:** Private personal command center for ADHD-friendly daily planning, weekly planning, project tracking, time visibility, task management, brain dumping, resource organization, and weekly accomplishment tracking.

---

## 1. Product Vision

LIVAL OS is a private personal operating system designed to help Liana structure her days, manage consulting work, organize personal/build projects, capture ideas, and see evidence of progress while unemployed and consulting.

The artifact should feel like a calm executive dashboard, not a busy productivity app. It should reduce decision fatigue, preserve momentum, and visually organize work across life, consulting, job search, build projects, and home operations.

The artifact should primarily **display and organize information that updates automatically** from backend sources. It should not depend on constant manual clicking, focus timers, or manual time tracking.

---

## 2. Core Principles

### 2.1 Automatic First

The interface should assume that most updates come from external/backend automation.

Expected automatic update sources include:

- Claude Code activity logs
- Brain dump submissions
- Email-to-inbox processing
- Resource/link captures
- Task/project updates
- Weekly accomplishment generation
- Time tracking data written by project tooling

The frontend should make those updates visible, reviewable, and easy to act on.

### 2.2 Minimal Manual Maintenance

Manual actions should be limited to:

- Add Task
- Add Brain Dump
- Add Resource
- Log Time from Code/manual fallback
- Approve Inbox Item
- Convert Inbox Item to Task / Project / Resource
- Move task between board columns
- Adjust daily plan
- Create new project

The artifact should not require the user to start or stop focus timers.

### 2.3 Desktop First

Optimize for a desktop Claude Cowork artifact. Mobile-specific views are out of scope for this version.

### 2.4 Visual State Management

The Board is essential and must be visually satisfying. The user specifically wants a Jira-like board with clear columns, labels, priorities, due dates, and time tracked.

### 2.5 Progress Visibility

The Reports page and Weekly Win Log are key motivational features. The system should help the user see what she completed each week while unemployed and consulting.

---

## 3. Naming and Information Architecture

### 3.1 Main Hierarchy

Use the following hierarchy throughout the UI:

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

### 3.2 Areas

Use these default Areas:

- Consulting
- Build Lab
- Job Search
- Life Admin
- Home Ops
- Learning

### 3.3 Workspaces

Initial Workspaces may include:

#### Consulting
- ETD
- Bistro
- Emergent

#### Build Lab
- Auto Job Apply Agent
- Personal Trainer Agent
- Portfolio Projects

#### Home Ops
- Home Assistant
- Cameras
- HVAC
- Z-Wave
- Automations

#### Life Admin
- Health
- Finance
- Travel
- Shopping
- Appointments

#### Job Search
- Applications
- Resume
- LinkedIn
- Networking
- Interview Prep

### 3.4 Board Statuses

Use these status columns:

- Backlog
- This Week
- In Progress
- Blocked
- Done

### 3.5 Priority Labels

Use these priority values:

- High
- Medium
- Low

No “P0/P1/P2” wording unless the user later requests it.

### 3.6 Common Labels

Task cards and task detail views may show labels such as:

- ETD
- Bistro
- Emergent
- Calculator
- Website
- Job Search
- Home Ops
- Claude
- AI
- Admin
- High
- Medium
- Low

---

## 4. Global Layout

### 4.1 App Shell

The artifact should use a persistent desktop app shell.

#### Left Sidebar

Dark sidebar with app branding and primary navigation.

Top branding:

```text
LIVAL OS
Personal Command Center
```

Navigation items:

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

#### Sidebar Quick Capture

At the bottom of the sidebar, include a “Quick Capture” section:

- + Add Task
- + Brain Dump
- + Add Resource
- ⏱ Log Time (Code)

The “Log Time (Code)” button is a manual fallback and/or entry point for displaying code-tracked time. It should not imply that the user must manually start a timer.

#### Sidebar Time Card

Include a compact weekly time card:

```text
This Week’s Time
34.2h

M T W T F S S
bar chart
```

Do not include the word “billable.”

### 4.2 Top Header

Across main content screens, include:

- Current page title
- Date selector
- Search bar
- Notifications icon
- Settings icon
- User avatar

The date selector can show:

```text
Wed, Jun 10, 2025
```

### 4.3 Visual Style

Use a clean modern dashboard style:

- Light main canvas
- Dark navy sidebar
- Purple accent color
- Rounded cards
- Soft shadows or subtle borders
- Clear spacing
- Compact but readable text
- Color-coded priority labels
- Minimal visual clutter

Suggested visual language:

- Green = on track / done / healthy
- Yellow/orange = medium priority / needs attention
- Red = high priority / blocked / urgent
- Purple = primary navigation, active states, links
- Blue = informational / resources / time charts

---

## 5. Global Components

### 5.1 Cards

Cards should include:

- Header/title
- Optional subtitle
- Key metric or content
- Small action link at bottom if relevant

### 5.2 Task Card

Task card fields:

- Task title
- Workspace
- Project
- Priority label
- Due date
- Status
- Labels
- Time tracked

Example:

```text
Update pricing logic
ETD / Enertia ROI Calculator
High
Due Today
Labels: ETD, Calculator
2.4h tracked
```

### 5.3 Project Card

Project card fields:

- Project name
- Workspace/client
- Progress ring or bar
- Health status
- Time this week
- Target date

Example:

```text
ETD / Enertia ROI Calculator
80%
12.3h this week
On Track
Target: Jun 20
```

### 5.4 Time Tracking Display

Time tracking should appear as:

- Total time
- Time by project
- Time by day
- Time by task where relevant

Do not include the word “billable” anywhere in V4.1.

### 5.5 Chart Types

Use these chart types:

- Donut chart for weekly progress and time allocation
- Small bar chart for weekly time by day
- Progress rings for projects
- Horizontal bars for project investment/time breakdown

---

## 6. Page: Command Center

### 6.1 Purpose

The Command Center is the main dashboard. It should answer:

- What are the top 3 things today?
- What is waiting for review?
- How much progress happened this week?
- How much time has been tracked this week?
- What is the current board state?

Do not add extra widgets beyond what is specified here.

### 6.2 Layout

Top row widgets:

1. Today’s Top 3
2. Inbox Overview
3. Weekly Progress
4. Time Tracking This Week

Second row:

5. Board Preview
6. Quick Stats card

### 6.3 Widget: Today’s Top 3

Show exactly 3 recommended items.

Each item includes:

- Rank number
- Workspace / Project
- Task title
- Priority label
- Due date/status metadata

Example:

```text
1
ETD / Enertia ROI Calculator
Update pricing logic
High
Due Today | In Progress
```

Footer link:

```text
View all in Daily Planner →
```

### 6.4 Widget: Inbox Overview

Show counts by inbox type:

- Client Emails
- Appointments
- Brain Dump Ideas
- Resources

Example:

```text
12 items awaiting review

Client Emails 5
Appointments 2
Brain Dump Ideas 3
Resources 2
```

Footer link:

```text
Open Inbox →
```

### 6.5 Widget: Weekly Progress

Show a donut chart.

Metrics:

- Tasks completed
- Total tasks target/available
- Breakdown by area

Example:

```text
24 Tasks Completed of 58

Consulting 8
Build Lab 10
Job Search 4
Life Admin 2
```

Footer link:

```text
View full report →
```

### 6.6 Widget: Time Tracking This Week

Show total tracked time and project breakdown.

Example:

```text
Total
34.2h

ETD / Enertia ROI Calculator 12.3h
Bistro / Website Update 6.1h
Auto Job Apply Agent 6.8h
Emergent / Client Ops 3.2h
Other 5.8h
```

Footer link:

```text
View time report →
```

Do not show billable/non-billable.

### 6.7 Widget: Board Preview

Mini board with columns:

- Backlog
- This Week
- In Progress
- Blocked
- Done This Week

Each column shows only a small number of cards.

Footer/action:

```text
View full board →
```

### 6.8 Widget: Quick Stats

Show small stat list:

- Active Projects
- Tasks Due This Week
- Tasks Overdue
- Blocked Tasks
- Unplanned Inbox
- Ideas Captured

Example:

```text
Active Projects 8
Tasks Due This Week 7
Tasks Overdue 2
Blocked Tasks 3
Unplanned Inbox 12
Ideas Captured 14
```

---

## 7. Page: Daily Planner

### 7.1 Purpose

The Daily Planner helps the user decide what to do today without overwhelm.

Do not change this layout from the final approved mockup.

### 7.2 Layout

Sections:

1. Today’s Focus
2. Schedule & Deadlines
3. Unplanned Items
4. Adjust My Plan button

### 7.3 Today’s Focus

Use three priority bands:

- Must Do
- Should Do
- Could Do

Each item should show:

- Task title
- Workspace / Project
- Priority
- Estimated time
- Due/status metadata

Example:

```text
MUST DO

Update pricing logic
ETD / Enertia ROI Calculator
High
2.0h
```

### 7.4 Schedule & Deadlines

Include:

- Appointments
- Client meetings
- Due today
- Due tomorrow

Example:

```text
Appointments
10:00 AM Dentist Appointment
1:00 PM Call with Mike (ETD)

Deadlines
Due Today: Update pricing logic
Due Tomorrow: Test calculations
```

### 7.5 Unplanned Items

Show newly arrived items that might affect the day.

Examples:

- Client feedback
- Interesting resource
- New appointment
- Brain dump task

Footer link:

```text
Review in Inbox →
```

### 7.6 Controls

Top/right controls:

- Date selector
- Auto Plan button
- More/options menu

Bottom action:

```text
Adjust my plan
```

---

## 8. Page: Weekly Planner

### 8.1 Purpose

The Weekly Planner helps the user plan outcomes and realistically place work during the week.

### 8.2 Approved Change

Replace “Project Priorities” with the Weekly Calendar. The Weekly Calendar should be the largest/right-side widget.

### 8.3 Layout

Left side:

1. This Week’s Outcomes
2. Focus Areas
3. Open Loops

Right side:

4. Weekly Calendar

### 8.4 This Week’s Outcomes

Numbered list of weekly outcomes.

Example:

```text
1. Finish ETD calculator updates
2. Apply to 5 roles
3. Build Auto Job Apply Agent MVP outline
4. Schedule dentist appointment
```

### 8.5 Focus Areas

Short ranked list of focus areas.

Example:

```text
1. Bistro — waiting for content
2. Emergent — need API access
3. Auto Job Apply Agent — needs data source
```

### 8.6 Open Loops

Checklist of unresolved loops.

Example:

```text
[ ] Follow up with Mike on pricing
[ ] Get access to ETD data source
[ ] Review job applications
```

### 8.7 Weekly Calendar

Large week-view calendar.

Columns:

- Mon
- Tue
- Wed
- Thu
- Fri
- Sat
- Sun

Rows can be simple time blocks.

Show colored event/task blocks such as:

- Job Search
- Focus Work
- ETD Work Block
- Admin
- Client Call
- Health Appointment

Footer link:

```text
View full calendar →
```

### 8.8 Controls

- Week selector
- Auto Plan button
- More/options menu

---

## 9. Page: Board

### 9.1 Purpose

The Board is the full task board and should be one of the most important pages.

This page should be named **Board**, not “Kanban Board.”

### 9.2 Layout

Top filter bar followed by full board columns.

### 9.3 Filters

Global filters:

- Area
- Project
- Labels
- Priority
- Due Date
- Status
- Search
- More Filters button

Example dropdown labels:

```text
All Areas
All Projects
All Labels
Priority
Due: All
```

### 9.4 Columns

Columns:

- Backlog
- This Week
- In Progress
- Blocked
- Done This Week

Each column should show a count.

Example:

```text
BACKLOG 18
THIS WEEK 8
IN PROGRESS 5
BLOCKED 2
DONE THIS WEEK 24
```

### 9.5 Board Cards

Each card includes:

- Workspace / Project
- Task title
- Labels
- Priority
- Due date if present
- Time tracked

Example:

```text
ETD / Enertia ROI Calc
Update pricing logic
Labels: ETD, Calculator
High
Due Today
2.4h
```

### 9.6 Card Interactions

Clicking a card opens Task Detail.

Drag/drop between columns may be included visually, but backend behavior can be added later.

---

## 10. Page: Projects

### 10.1 Purpose

Projects is the portfolio tracker. It should not be cluttered with task lists.

The Project Portfolio card that was previously on the dashboard belongs here.

### 10.2 Layout

Top filters:

- Group by Area
- All Projects
- Optional grid/list toggle

Then grouped project cards.

### 10.3 Groups

Default groups:

- Consulting
- Build Lab
- Life Admin
- Home Ops
- Job Search
- Learning

### 10.4 Project Cards

Each card includes:

- Project name
- Workspace/client
- Progress ring
- Time this week
- Health
- Target date if available

Example:

```text
ETD / Enertia ROI Calculator
80%
12.3h this week
On Track
```

### 10.5 Actions

Include a “+ New Project” card/button.

Clicking a project opens Project Detail.

---

## 11. Page: Project Detail

### 11.1 Purpose

Project Detail provides a deeper view into a single project.

Use the V1 project view layout, with the V2-style time tracking card added.

### 11.2 Header

Show:

- Project name
- Workspace/client
- Status badge
- Back to Projects link
- Edit button

Example:

```text
ETD / Enertia ROI Calculator
On Track
```

### 11.3 Tabs

Tabs:

- Overview
- Tasks
- Timeline
- Time
- Resources
- Notes
- Activity

### 11.4 Overview Tab Layout

Cards/widgets:

1. Progress
2. Project Info
3. Time Tracking This Week
4. Recent Activity
5. Upcoming Tasks

### 11.5 Progress Card

Show progress ring and milestone summary.

Example:

```text
80%
On Track
12 of 15 milestones
Due: Jun 20, 2025
```

### 11.6 Project Info Card

Do not include Project Owner or Assignee.

Fields:

- Client or Workspace
- Area
- Start Date
- Target Date
- Health

Example:

```text
Client: ETD
Area: Consulting
Start Date: May 15, 2025
Target Date: Jun 20, 2025
Health: On Track
```

### 11.7 Time Tracking Card

Show only total time.

No billable field.

Example:

```text
Time Tracking This Week
12.3h

Bar chart:
M T W T F S
```

Footer link:

```text
View full time report →
```

### 11.8 Recent Activity

Examples:

```text
Task completed: Update labor section
Time logged: 1.2h via Claude Code
File added: pricing_v2.xlsx
Note added: Client feedback
```

### 11.9 Upcoming Tasks

List upcoming tasks with priority labels and due dates.

---

## 12. Page: Task Detail

### 12.1 Purpose

Task Detail shows all useful information about one task.

Use V1 task detail structure, with added time tracking and labels.

### 12.2 Header

Show:

- Task title
- Workspace / Project
- Current status
- Back to board link
- More/options button
- Close button if displayed as a modal/panel

### 12.3 Tabs

Tabs:

- Details
- Subtasks
- Files
- Notes
- Activity

### 12.4 Details Fields

Do not include Assignee.

Fields:

- Due Date
- Priority
- Labels
- Area / Project
- Estimated Time
- Time Tracked
- Remaining
- Created Date
- Description

Example:

```text
Due Date: Today, Jun 10
Priority: High
Labels: ETD, Calculator, High
Area / Project: Consulting / ETD
Estimated Time: 3.0h
Time Tracked: 2.4h
Remaining: 0.6h
Created: Jun 5, 2025
```

### 12.5 Time Tracking Widget

Show:

- Total time
- Weekly bar chart
- “Auto-tracked via Claude Code” note where applicable

Example:

```text
Total Time
2.4h

M T W T F S
bar chart

Auto-tracked via Claude Code
```

Footer link:

```text
View full time report →
```

### 12.6 Recent Activity

Examples:

```text
Time tracked: 32m
File added: pricing_v2.xlsx
Note added: Client feedback
```

---

## 13. Page: Inbox

### 13.1 Purpose

The Inbox is the review queue for automatically captured items.

Everything that is not confidently auto-classified should appear here.

### 13.2 Tabs

Tabs:

- All
- Emails
- Appointments
- Ideas
- Resources

### 13.3 List Item Fields

Each inbox item includes:

- Source icon/type
- Sender/source title
- Subject/title
- Suggested classification
- Age/timestamp
- Type label

Example:

```text
From: Mike (ETD)
Re: Enertia calculator updates
Potential Task
2m
```

### 13.4 Actions

Footer actions:

- Approve
- Convert
- Archive

Individual items can support:

- Convert to Task
- Convert to Project
- Save as Resource
- Archive

---

## 14. Page: Brain Dump

### 14.1 Purpose

The Brain Dump is a low-pressure idea capture space.

Keep this page simple and close to the approved V1 design.

### 14.2 Tabs

Tabs:

- All
- Ideas
- Thoughts
- Someday/Maybe
- Links

### 14.3 List Item Fields

Each item includes:

- Checkbox
- Title
- Type label
- Date captured

Examples:

```text
Build AI travel agent
Idea
Today
```

```text
Create fantasy football app
Idea
Yesterday
```

```text
Start YouTube channel
Idea
Jun 8
```

### 14.4 Actions

Actions:

- + Add Idea
- Convert to Project
- Archive
- Filter
- Sort

---

## 15. Page: Resources

### 15.1 Purpose

Resources is the lightweight knowledge base/bookmark library.

### 15.2 Layout

Left side:

- Categories

Right side:

- Resource list

### 15.3 Categories

Default categories:

- AI / Claude
- Databricks
- Job Search
- Home Assistant
- Consulting
- Travel
- Marketing
- Finance
- Other

Each category shows a count.

### 15.4 Resource Item Fields

Each resource includes:

- Title
- Source/link
- Category
- Related project
- Date added
- Optional notes

Example:

```text
Claude Code Best Practices
https://docs.anthropic.com
AI / Claude
Yesterday
```

### 15.5 Actions

- Search resources
- Filter
- Sort
- + Add Resource

---

## 16. Page: Reports

### 16.1 Purpose

Reports is the weekly accomplishment and evidence-of-progress page.

Do not change the Weekly Accomplishment layout from the approved mockup.

### 16.2 Tabs

Tabs:

- Overview
- Trends
- Time
- Tasks
- Projects
- Themes

### 16.3 Weekly Accomplishment Header

Show week range.

Example:

```text
Week of Jun 8 — Jun 14, 2025
```

Include Export button.

### 16.4 KPI Cards

Show:

- Tasks Completed
- Hours Worked
- Projects Advanced
- Ideas Captured

Example:

```text
Tasks Completed: 24
Hours Worked: 34.2h
Projects Advanced: 6
Ideas Captured: 14
```

### 16.5 Time Allocation

Donut chart by Area.

Example:

```text
Consulting 45%
Build Lab 30%
Job Search 15%
Life Admin 10%
```

### 16.6 Project Investment

Table/list showing time by project.

Example:

```text
ETD / Enertia ROI Calc 12.3h
Auto Job Apply Agent 6.8h
Bistro / Website Update 6.1h
Emergent / Client Ops 3.2h
Home Assistant Agent 4.7h
Other 1.1h
```

### 16.7 Weekly Win Log

This is a key feature and should be visually prominent.

Example:

```text
Weekly Win Log

✓ Updated Enertia pricing model
✓ Submitted 5 job applications
✓ Defined MVP for Auto Job Apply Agent
✓ Built Home Assistant camera dashboard
✓ Scheduled dentist appointment
✓ Added 14 new ideas to Brain Dump
✓ Had productive calls with ETD and Bistro
```

### 16.8 Weekly Summary

Short natural language summary.

Example:

```text
Great week. You spent 34.2 hours across 24 tasks and moved 6 projects forward. Consulting work stayed strong while job search and Build Lab maintained momentum.
```

### 16.9 Momentum Score

Show score card.

Example:

```text
92 / 100
Excellent
```

---

## 17. Page: Archive

### 17.1 Purpose

Archive stores completed weekly snapshots.

### 17.2 Layout

List of weekly snapshots.

Example:

```text
Week of Jun 1 — Jun 7, 2025    View
Week of May 25 — May 31, 2025  View
Week of May 18 — May 24, 2025  View
```

Footer:

```text
View all archive →
```

### 17.3 Archived Snapshot Contents

Each snapshot should contain:

- Completed tasks
- Weekly win log
- Hours worked
- Projects advanced
- Ideas captured
- Weekly summary
- Momentum score

---

## 18. Clickthrough and Navigation Rules

### 18.1 Primary Navigation

Sidebar navigation changes main page.

### 18.2 Dashboard Links

- “View all in Daily Planner” opens Daily Planner
- “Open Inbox” opens Inbox
- “View full report” opens Reports
- “View time report” opens Reports or Project Time tab depending context
- “View full board” opens Board

### 18.3 Board Links

- Click task card → Task Detail
- Click project/workspace on task card → Project Detail
- Click column add task → create task interaction

### 18.4 Projects Links

- Click project card → Project Detail
- + New Project → create project interaction

### 18.5 Project Detail Links

- Click upcoming task → Task Detail
- Click Time tab → time detail view
- Click Resources tab → project-filtered resources
- Click Activity tab → project activity timeline

### 18.6 Inbox Links

- Approve → item becomes accepted into suggested destination
- Convert → opens conversion options
- Archive → removes from active inbox

### 18.7 Brain Dump Links

- Convert to Project → project creation flow
- Convert to Task → task creation flow
- Archive → removes from active brain dump

### 18.8 Reports Links

- Export → placeholder export action
- View previous weeks → Archive

---

## 19. Data Expectations for Frontend Prototype

The initial Claude artifact can use mock data. Use realistic sample data from the user's actual project structure.

### 19.1 Sample Projects

- ETD / Enertia ROI Calculator
- Bistro / Website Update
- Emergent / Client Ops
- Auto Job Apply Agent / MVP Architecture
- Personal Trainer Agent / Agent Design
- Home Assistant Agent / Camera Dashboard
- Travel / Chicago Trip
- Health / Appointments

### 19.2 Sample Tasks

- Update pricing logic
- Remove labor section
- Test calculations
- Validate with Mike
- Apply to 5 roles
- Define MVP architecture
- Setup camera dashboard
- Schedule dentist appointment
- Book flight to Chicago
- Review website update

### 19.3 Sample Resources

- Claude Code Best Practices
- Databricks Interview Guide
- Home Assistant Automation Guide
- ETD Onboarding Docs
- Chicago Travel Guide

### 19.4 Sample Inbox Items

- From Mike (ETD): Enertia calculator updates
- Dentist appointment confirmation
- From Matt (Bistro): Website images and copy
- Idea: Build travel points dashboard
- Claude article: Best Claude Code practices

---

## 20. Out of Scope for Frontend V4.1

Do not build these yet:

- Backend database integration
- Notion sync
- Gmail integration
- Claude Code time tracking skill
- Siri Shortcut integration
- Mobile app
- Focus timer
- Persistent “Now Working On” bar
- Recent Wins widget on Command Center
- Multi-user ownership/assignee features
- Billable vs non-billable time labels

---

## 21. Build Instructions for Claude

Claude should build the artifact as an interactive frontend prototype first.

### 21.1 Recommended Implementation

Use a single-page React artifact with:

- Componentized layout
- Mock JSON data
- Sidebar navigation state
- Clickable cards
- Clickthroughs to Project Detail and Task Detail
- Simple filters
- Charts using CSS/SVG or lightweight inline chart components
- No external backend calls
- No authentication
- No real persistence in the first version

### 21.2 Required Interactivity

The prototype should support:

- Navigate between pages
- Open full Board from Command Center
- Open Daily Planner from Command Center
- Open Reports from Command Center
- Open Inbox from Command Center
- Open Project Detail from Projects
- Open Task Detail from Board
- Switch tabs in Project Detail
- Switch tabs in Task Detail
- Switch tabs in Reports
- Filter board cards visually
- Search placeholder behavior
- Convert/Approve/Archive buttons as frontend-only placeholders

### 21.3 Acceptance Criteria

The artifact is successful if:

- The Command Center matches the approved final mockup structure.
- The Daily Planner is unchanged from the approved final mockup.
- The Weekly Planner uses a large Weekly Calendar instead of Project Priorities.
- The Board page is named Board and shows full task columns.
- Projects page contains the portfolio tracker.
- Project Detail removes owner/assignee and includes total time tracking.
- Task Detail removes assignee and includes labels/time tracking.
- Reports includes Weekly Accomplishment Report and Weekly Win Log.
- No billable time labels appear anywhere.
- No mobile command center is included.
- No recent wins widget is added to Command Center.
- The interface feels calm, visual, and not overcrowded.

---

## 22. Final Approved Page List

The LIVAL OS frontend artifact must include:

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

---

## 23. Final Reminder to Builder

Do not reinterpret this as a generic productivity app.

LIVAL OS is a private, ADHD-friendly personal command center for:

- unemployment structure
- consulting tracking
- project momentum
- brain dumping
- automatic time visibility
- daily planning
- weekly accomplishment evidence

Keep it visual, calm, and motivating.
