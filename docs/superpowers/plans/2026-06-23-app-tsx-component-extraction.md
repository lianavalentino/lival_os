# App.tsx Component Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 1754-line monolithic `src/App.tsx` into focused files under `src/components/*`, with zero behavior change. Closes kanban Phase 2 items 2-1, 2-2, 2-5, 2-6, 2-7, 2-10 (`docs/superpowers/kanban.html`) and the deferred extraction noted in `docs/superpowers/specs/2026-06-16-phase2-planning-tables-wiring-design.md:22`.

**Architecture:** Mechanical, verbatim code relocation — no new behavior, no renamed props, no logic changes. Two shared foundation modules (`src/lib/view-helpers.ts`, `src/components/ui/primitives.tsx`) get extracted first since every other new file depends on them. Then 17 component files extract independently (each only *adds* a new file — none touch `App.tsx`), which makes them safe to dispatch in parallel with zero merge conflicts. A final single task rewrites `App.tsx` down to `App` + `LivalShell` (state/handlers/orchestration only), wiring in every extracted component and deleting the now-dead inline code.

**Tech Stack:** Vite + React 19 + TypeScript (existing). No new dependencies.

## Global Constraints

- No behavior change. Every extracted component must render pixel-identical output and call the same handlers with the same arguments as today.
- Named exports for every new file (`export function X(...)`), matching the existing style in `src/lib/repository.ts` / `src/lib/metrics.ts`. Only `App.tsx` keeps `export default App` (required by `src/main.tsx`).
- No Tailwind, no CSS modules — keep using the existing global `className` strings exactly as written; styling lives in `src/styles.css` and is untouched by this plan.
- `npm run build` (tsc -b && vite build) and `npm run lint` must pass after every task — both are zero-warning-tolerant for type errors, lint runs at `warn` severity for `react-refresh/only-export-components`, so warnings there are acceptable.
- Each new file imports only the icons/helpers it actually uses (no copy-pasting the full original icon import list into every file).

---

## File Structure

```
src/
  lib/
    view-helpers.ts          [NEW] navItems, bottomNav, statusOrder, statusTone, viewTitle, viewSubtitle, lookupWorkspace, lookupProject, priorityRank
  components/
    ui/
      primitives.tsx         [NEW] PanelHeader, Metric, Progress, Priority, StatusPill, ListItems, TabbedList, Timeline
    AuthGate.tsx              [NEW]
    LoadingScreen.tsx         [NEW]
    Sidebar.tsx               [NEW] (owns the mobile-nav scrim too — same `position: fixed` stacking, see Task 3 note)
    TopBar.tsx                [NEW]
    BottomNav.tsx             [NEW]
    CapturePanel.tsx          [NEW]
    views/
      CommandCenter.tsx       [NEW]
      DailyPlanner.tsx        [NEW]
      WeeklyPlanner.tsx       [NEW]
      BoardView.tsx           [NEW]
      ProjectsView.tsx        [NEW]
      ProjectDetail.tsx       [NEW]
      TaskDetail.tsx          [NEW]
      InboxView.tsx           [NEW]
      BrainDumpView.tsx       [NEW]
      ResourcesView.tsx       [NEW]
      ReportsView.tsx         [NEW]
      ArchiveView.tsx         [NEW]
      SettingsView.tsx        [NEW]
  App.tsx                     [REWRITE — shrinks to App + LivalShell orchestration only]
```

**Execution order:**
- **Stage 1 (sequential, foundation):** Task 1, Task 2.
- **Stage 2 (parallel-safe, additive-only):** Tasks 3–17 (Task 17 bundles the last 5 small views). Each task creates one or more new files and touches nothing else. Dispatch with `superpowers:dispatching-parallel-agents` — no shared state, no file collisions.
- **Stage 3 (sequential, integration):** Task 18 — rewrites `App.tsx`. Must run after every Stage 2 task lands.
- **Stage 4:** Task 19 — full verification + manual smoke pass.

---

### Task 1: Shared view helpers

**Files:**
- Create: `src/lib/view-helpers.ts`

**Interfaces:**
- Produces: `navItems: Array<{ key: ViewKey; label: string; icon: typeof Home }>`, `bottomNav` (same shape, filtered), `statusOrder: TaskStatus[]`, `statusTone: Record<TaskStatus, string>`, `viewTitle(view: ViewKey): string`, `viewSubtitle(view: ViewKey): string`, `lookupWorkspace(data: AppData, id?: string)`, `lookupProject(data: AppData, id?: string)`, `priorityRank(priority: Task["priority"]): number`.

- [ ] **Step 1: Create the file**

```ts
import {
  Archive,
  BarChart3,
  Brain,
  CalendarDays,
  FolderKanban,
  Home,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Link2,
  Settings,
  Target,
} from "lucide-react";
import type { AppData, Task, TaskStatus, ViewKey } from "../types";

export const navItems: Array<{ key: ViewKey; label: string; icon: typeof Home }> = [
  { key: "command", label: "Command", icon: LayoutDashboard },
  { key: "daily", label: "Daily", icon: CalendarDays },
  { key: "weekly", label: "Weekly", icon: Target },
  { key: "board", label: "Board", icon: KanbanSquare },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "brain-dump", label: "Brain Dump", icon: Brain },
  { key: "resources", label: "Resources", icon: Link2 },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "archive", label: "Archive", icon: Archive },
  { key: "settings", label: "Settings", icon: Settings },
];

export const bottomNav = navItems.filter((item) =>
  ["command", "board", "projects", "inbox"].includes(item.key),
);

export const statusOrder: TaskStatus[] = [
  "backlog",
  "this_week",
  "in_progress",
  "blocked",
  "done",
];

export const statusTone: Record<TaskStatus, string> = {
  backlog: "neutral",
  this_week: "yellow",
  in_progress: "blue",
  blocked: "red",
  done: "green",
};

export function viewTitle(view: ViewKey) {
  const titles: Record<ViewKey, string> = {
    command: "Command Center",
    daily: "Daily Planner",
    weekly: "Weekly Planner",
    board: "Board",
    projects: "Projects",
    "project-detail": "Project Detail",
    "task-detail": "Task Detail",
    inbox: "Inbox",
    "brain-dump": "Brain Dump",
    resources: "Resources",
    reports: "Reports",
    archive: "Archive",
    settings: "Settings",
  };
  return titles[view];
}

export function viewSubtitle(view: ViewKey) {
  const subtitles: Record<ViewKey, string> = {
    command: "Top priorities, review queues, progress, and time in one scan.",
    daily: "Must do, should do, could do, schedule, and unplanned items.",
    weekly: "Outcomes, focus areas, project priorities, and open loops.",
    board: "All active tasks grouped by workflow status.",
    projects: "Portfolio grouped by area with health and progress.",
    "project-detail": "Progress, tasks, time, resources, notes, and activity.",
    "task-detail": "Task context, status, subtasks, notes, and activity.",
    inbox: "Captured items waiting for review or conversion.",
    "brain-dump": "Low-pressure space for ideas, thoughts, and someday items.",
    resources: "Reference library for tools, clients, learning, and life admin.",
    reports: "Weekly accomplishment evidence and momentum signals.",
    archive: "Completed snapshots and historical reports.",
    settings: "Private app status, persistence, and future automation hooks.",
  };
  return subtitles[view];
}

export function lookupWorkspace(data: AppData, id?: string) {
  return data.workspaces.find((workspace) => workspace.id === id);
}

export function lookupProject(data: AppData, id?: string) {
  return data.projects.find((project) => project.id === id);
}

export function priorityRank(priority: Task["priority"]) {
  return { high: 0, medium: 1, low: 2 }[priority];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: succeeds (this file isn't imported anywhere yet, but `tsc -b` type-checks all files under `include: ["src"]` regardless).

- [ ] **Step 3: Commit**

```bash
git add src/lib/view-helpers.ts
git commit -m "refactor: extract shared view helpers from App.tsx"
```

---

### Task 2: Shared UI primitives

**Files:**
- Create: `src/components/ui/primitives.tsx`

**Interfaces:**
- Consumes: `AppData`, `Task` from `../../types`.
- Produces: `PanelHeader`, `Metric`, `Progress`, `Priority`, `StatusPill`, `ListItems`, `TabbedList<T>`, `Timeline` — all named exports, props identical to the current inline versions in `App.tsx`.

- [ ] **Step 1: Create the file**

```tsx
import { ReactNode, useState } from "react";
import { ChevronRight, Home } from "lucide-react";
import type { AppData, Task } from "../../types";

export function PanelHeader({
  title,
  icon: Icon,
  action,
  onAction,
}: {
  title: string;
  icon: typeof Home;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <header className="panel-header">
      <div>
        <Icon size={17} />
        <h2>{title}</h2>
      </div>
      {action && (
        <button onClick={onAction} type="button">
          {action}
          <ChevronRight size={15} />
        </button>
      )}
    </header>
  );
}

export function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "purple" | "blue" | "green" | "red";
}) {
  return (
    <div className={`metric ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function Progress({ percent }: { percent: number }) {
  return (
    <div className="progress" aria-label={`${percent}% complete`}>
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}

export function Priority({ priority }: { priority: Task["priority"] }) {
  return <span className={`priority ${priority}`}>{priority}</span>;
}

export function StatusPill({ active, label }: { active: boolean; label: string }) {
  return <span className={`status-pill ${active ? "active" : ""}`}>{label}</span>;
}

export function ListItems({
  items,
  empty = "Nothing here yet.",
}: {
  items: string[];
  empty?: string;
}) {
  return (
    <ul className="list-items">
      {items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>{empty}</li>}
    </ul>
  );
}

export function TabbedList<T>({
  tabs,
  items,
  getTab,
  render,
}: {
  tabs: string[];
  items: T[];
  getTab: (item: T) => string;
  render: (item: T) => ReactNode;
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const visible = activeTab === "all" ? items : items.filter((item) => getTab(item) === activeTab);

  return (
    <section className="panel span-3">
      <div className="tabs" role="tablist">
        {tabs.map((tab) => (
          <button className={activeTab === tab ? "active" : ""} key={tab} onClick={() => setActiveTab(tab)} type="button">
            {tab.replace("-", " ")}
          </button>
        ))}
      </div>
      <div className="review-list">
        {visible.map((item, index) => (
          <article key={index}>{render(item)}</article>
        ))}
      </div>
    </section>
  );
}

export function Timeline({ data }: { data: AppData }) {
  return (
    <div className="timeline">
      {data.tasks
        .filter((task) => task.dueDate)
        .slice(0, 5)
        .map((task) => (
          <div key={task.id}>
            <span>{task.dueDate}</span>
            <strong>{task.title}</strong>
          </div>
        ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/primitives.tsx
git commit -m "refactor: extract shared UI primitives from App.tsx"
```

---

## Stage 2 — Parallel component extraction (Tasks 3–17)

Each task below is **additive-only**: create the one named file, verify build, commit. None of these tasks touch `App.tsx`. Dispatch all of them together via `superpowers:dispatching-parallel-agents` once Tasks 1–2 are committed — there is no shared state between them and no risk of merge conflicts since each creates a distinct path. Every task's verify/commit steps are identical in shape to Task 1–2's Step 2/3 (`npm run build` then `git add <file> && git commit -m "..."`) — omitted below per-task for brevity except where the commit message differs.

### Task 3: Sidebar

**Files:** Create `src/components/Sidebar.tsx`

**Interfaces:** Consumes `navItems` from `../lib/view-helpers`, `minutesToHours` from `../lib/metrics`, `ViewKey` from `../types`. Produces `Sidebar({ activeView, mobileNavOpen, totalMinutes, activeProjectsCount, onSelect, onCloseMobileNav, onOpenCapture })`.

> Note: the mobile-nav scrim (`<button className="mobile-scrim" .../>`) moves into this component as a fragment sibling of `<aside>`, instead of living inside `<main>` in `App.tsx`. Verified safe: `.sidebar` is `position: sticky` desktop / `position: fixed; z-index: 20` mobile, `.mobile-scrim` is `position: fixed; z-index: 15` (`src/styles.css:77-88`, `:1183-1200`) — both are explicit-z-index fixed-position elements, so DOM order doesn't affect visual stacking or click targets.

```tsx
import { Clock3, Plus } from "lucide-react";
import type { ViewKey } from "../types";
import { minutesToHours } from "../lib/metrics";
import { navItems } from "../lib/view-helpers";

export function Sidebar({
  activeView,
  mobileNavOpen,
  totalMinutes,
  activeProjectsCount,
  onSelect,
  onCloseMobileNav,
  onOpenCapture,
}: {
  activeView: ViewKey;
  mobileNavOpen: boolean;
  totalMinutes: number;
  activeProjectsCount: number;
  onSelect: (view: ViewKey) => void;
  onCloseMobileNav: () => void;
  onOpenCapture: () => void;
}) {
  return (
    <>
      <aside className={`sidebar ${mobileNavOpen ? "is-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">LV</div>
          <div>
            <strong>LIVAL OS</strong>
            <span>Personal command system</span>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${activeView === item.key ? "active" : ""}`}
                key={item.key}
                onClick={() => onSelect(item.key)}
                type="button"
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <div className="mini-card-heading">
            <Clock3 size={16} />
            <span>Weekly Time</span>
          </div>
          <strong>{minutesToHours(totalMinutes)}</strong>
          <span>{activeProjectsCount} active projects</span>
        </div>

        <button className="primary-action" onClick={onOpenCapture} type="button">
          <Plus size={18} />
          Quick Capture
        </button>
      </aside>

      {mobileNavOpen && (
        <button
          aria-label="Close navigation"
          className="mobile-scrim"
          onClick={onCloseMobileNav}
          type="button"
        />
      )}
    </>
  );
}
```

Commit message: `refactor: extract Sidebar from App.tsx`

### Task 4: TopBar

**Files:** Create `src/components/TopBar.tsx`

**Interfaces:** Consumes `StatusPill` from `./ui/primitives`, `viewTitle`/`viewSubtitle` from `../lib/view-helpers`, `ViewKey` from `../types`. Produces `TopBar({ activeView, repositoryMode, onOpenMobileNav, onOpenCapture })`.

```tsx
import { Menu, Plus, Search } from "lucide-react";
import type { ViewKey } from "../types";
import { StatusPill } from "./ui/primitives";
import { viewTitle, viewSubtitle } from "../lib/view-helpers";

export function TopBar({
  activeView,
  repositoryMode,
  onOpenMobileNav,
  onOpenCapture,
}: {
  activeView: ViewKey;
  repositoryMode: "demo" | "supabase";
  onOpenMobileNav: () => void;
  onOpenCapture: () => void;
}) {
  return (
    <header className="topbar">
      <button
        className="icon-button mobile-only"
        onClick={onOpenMobileNav}
        type="button"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>
      <div>
        <h1>{viewTitle(activeView)}</h1>
        <p>{viewSubtitle(activeView)}</p>
      </div>
      <div className="topbar-actions">
        <StatusPill
          active={repositoryMode === "supabase"}
          label={repositoryMode === "supabase" ? "Supabase live" : "Demo mode"}
        />
        <div className="search-control">
          <Search size={16} />
          <span>Search anything</span>
        </div>
        <button className="primary-action compact" onClick={onOpenCapture} type="button">
          <Plus size={17} />
          Capture
        </button>
      </div>
    </header>
  );
}
```

Commit message: `refactor: extract TopBar from App.tsx`

### Task 5: BottomNav

**Files:** Create `src/components/BottomNav.tsx`

**Interfaces:** Consumes `bottomNav` from `../lib/view-helpers`, `ViewKey` from `../types`. Produces `BottomNav({ activeView, onSelect })`.

```tsx
import type { ViewKey } from "../types";
import { bottomNav } from "../lib/view-helpers";

export function BottomNav({
  activeView,
  onSelect,
}: {
  activeView: ViewKey;
  onSelect: (view: ViewKey) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {bottomNav.map((item) => {
        const Icon = item.icon;
        return (
          <button
            className={activeView === item.key ? "active" : ""}
            key={item.key}
            onClick={() => onSelect(item.key)}
            type="button"
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

Commit message: `refactor: extract BottomNav from App.tsx`

### Task 6: CapturePanel

**Files:** Create `src/components/CapturePanel.tsx`

**Interfaces:** Consumes `AppData`, `CaptureDraft` from `../types`. Produces `CapturePanel({ data, draft, isOpen, onClose, onDraft, isSaving, onSubmit })`.

```tsx
import { FormEvent } from "react";
import { Plus, X } from "lucide-react";
import type { AppData, CaptureDraft } from "../types";

export function CapturePanel({
  data,
  draft,
  isOpen,
  onClose,
  onDraft,
  isSaving,
  onSubmit,
}: {
  data: AppData;
  draft: CaptureDraft;
  isOpen: boolean;
  onClose: () => void;
  onDraft: (draft: CaptureDraft) => void;
  isSaving: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="drawer-wrap">
      <button className="drawer-scrim" onClick={onClose} type="button" aria-label="Close capture" />
      <aside className="capture-drawer" aria-label="Quick Capture">
        <header>
          <div>
            <h2>Quick Capture</h2>
            <p>Save the thought now. Sort it later.</p>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <form onSubmit={onSubmit}>
          <label>
            Title
            <input value={draft.title} onChange={(event) => onDraft({ ...draft, title: event.target.value })} autoFocus />
          </label>
          <label>
            Type
            <select value={draft.type} onChange={(event) => onDraft({ ...draft, type: event.target.value as CaptureDraft["type"] })}>
              <option value="task">Task</option>
              <option value="idea">Inbox idea</option>
              <option value="resource">Inbox resource</option>
              <option value="email">Email</option>
              <option value="appointment">Appointment</option>
              <option value="note">Note</option>
              <option value="brain">Brain dump</option>
            </select>
          </label>
          <label>
            Area
            <select value={draft.areaId} onChange={(event) => onDraft({ ...draft, areaId: event.target.value })}>
              {data.areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Notes
            <textarea value={draft.body} onChange={(event) => onDraft({ ...draft, body: event.target.value })} rows={6} />
          </label>
          <button className="primary-action" disabled={isSaving} type="submit">
            <Plus size={17} />
            {isSaving ? "Saving..." : "Save Capture"}
          </button>
        </form>
      </aside>
    </div>
  );
}
```

Commit message: `refactor: extract CapturePanel from App.tsx`

### Task 7: AuthGate

**Files:** Create `src/components/AuthGate.tsx`

**Interfaces:** Consumes `supabase` from `../lib/supabase`. Produces `AuthGate()` — no props.

```tsx
import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { supabase } from "../lib/supabase";

export function AuthGate() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setError(result.error.message);
    } else if (isSignUp && !result.data.session) {
      setMessage("Account created. Check email confirmation settings if sign-in does not continue automatically.");
    } else {
      setMessage("Signed in. Loading LIVAL OS.");
    }

    setIsSubmitting(false);
  };

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark">LV</div>
          <div>
            <strong>LIVAL OS</strong>
            <span>Private command system</span>
          </div>
        </div>
        <h1>{isSignUp ? "Create private access" : "Sign in"}</h1>
        <p>Use the email/password account connected to the LIVAL_OS Supabase project.</p>
        <form onSubmit={submitAuth}>
          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error && <div className="app-alert error">{error}</div>}
          {message && <div className="app-alert success">{message}</div>}
          <button className="primary-action" disabled={isSubmitting} type="submit">
            <LockKeyhole size={17} />
            {isSubmitting ? "Working..." : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>
        <button className="link-button" onClick={() => setIsSignUp((value) => !value)} type="button">
          {isSignUp ? "Already have access? Sign in" : "First setup? Create account"}
        </button>
      </section>
    </main>
  );
}
```

Commit message: `refactor: extract AuthGate from App.tsx`

### Task 8: LoadingScreen

**Files:** Create `src/components/LoadingScreen.tsx`

**Interfaces:** Produces `LoadingScreen({ title, embedded? })`.

```tsx
export function LoadingScreen({
  title,
  embedded = false,
}: {
  title: string;
  embedded?: boolean;
}) {
  return (
    <main className={embedded ? "loading-panel" : "auth-screen"}>
      <section className="panel loading-card">
        <div className="loading-dot" />
        <h1>{title}</h1>
        <p>Connecting the pieces without making a racket.</p>
      </section>
    </main>
  );
}
```

Commit message: `refactor: extract LoadingScreen from App.tsx`

### Task 9: CommandCenter

**Files:** Create `src/components/views/CommandCenter.tsx`

**Interfaces:** Consumes `dashboardMetrics`, `minutesToHours`, `tasksByStatus` from `../../lib/metrics`; `lookupProject`, `lookupWorkspace`, `priorityRank`, `statusTone` from `../../lib/view-helpers`; `Metric`, `PanelHeader`, `Priority`, `Progress` from `../ui/primitives`. Produces `CommandCenter({ data, metrics, onCapture, onOpenBoard, onOpenInbox, onSelectProject, onSelectTask })`.

```tsx
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Inbox,
  KanbanSquare,
  Plus,
  Target,
} from "lucide-react";
import type { AppData } from "../../types";
import { dashboardMetrics, minutesToHours, tasksByStatus } from "../../lib/metrics";
import { lookupProject, lookupWorkspace, priorityRank, statusTone } from "../../lib/view-helpers";
import { Metric, PanelHeader, Priority, Progress } from "../ui/primitives";

export function CommandCenter({
  data,
  metrics,
  onCapture,
  onOpenBoard,
  onOpenInbox,
  onSelectProject,
  onSelectTask,
}: {
  data: AppData;
  metrics: ReturnType<typeof dashboardMetrics>;
  onCapture: () => void;
  onOpenBoard: () => void;
  onOpenInbox: () => void;
  onSelectProject: (projectId: string) => void;
  onSelectTask: (taskId: string) => void;
}) {
  const topTasks = data.tasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .slice(0, 3);

  return (
    <div className="dashboard-grid">
      <section className="panel span-2 command-top-priorities">
        <PanelHeader title="Today's Top 3" icon={Target} action="Open board" onAction={onOpenBoard} />
        <div className="priority-list">
          {topTasks.map((task, index) => (
            <button className="task-row" key={task.id} onClick={() => onSelectTask(task.id)} type="button">
              <span className="rank">{index + 1}</span>
              <span>
                <strong>{task.title}</strong>
                <small>{lookupProject(data, task.projectId)?.name || lookupWorkspace(data, task.workspaceId)?.name}</small>
              </span>
              <Priority priority={task.priority} />
            </button>
          ))}
        </div>
      </section>

      <section className="panel command-inbox-panel">
        <PanelHeader title="Inbox Overview" icon={Inbox} action="Review" onAction={onOpenInbox} />
        <div className="metric-stack">
          <Metric label="New" value={metrics.newInboxCount} tone="blue" />
          <Metric label="Ideas" value={data.inboxItems.filter((item) => item.type === "idea").length} tone="purple" />
          <Metric label="Resources" value={data.inboxItems.filter((item) => item.type === "resource").length} tone="green" />
        </div>
      </section>

      <section className="panel span-3 command-board-panel">
        <PanelHeader title="Board Preview" icon={KanbanSquare} action="View full board" onAction={onOpenBoard} />
        <div className="board-preview">
          {tasksByStatus(data).map((column) => (
            <div className={`mini-column ${statusTone[column.status]}`} key={column.status}>
              <div className="mini-column-header">
                <strong>{column.label}</strong>
                <span>{column.tasks.length}</span>
              </div>
              {column.tasks.slice(0, 3).map((task) => (
                <button key={task.id} onClick={() => onSelectTask(task.id)} type="button">
                  <strong>{task.title}</strong>
                  <small>{lookupWorkspace(data, task.workspaceId)?.name}</small>
                  <span>
                    <Priority priority={task.priority} />
                    {task.dueDate && <em>{task.dueDate}</em>}
                  </span>
                </button>
              ))}
              {column.tasks.length > 3 && <p>+ {column.tasks.length - 3} more</p>}
            </div>
          ))}
          <div className="mini-column stats-column">
            <div className="mini-column-header">
              <strong>Quick Stats</strong>
              <span>{metrics.activeCount}</span>
            </div>
            <dl>
              <div>
                <dt>Active Projects</dt>
                <dd>{metrics.activeProjectsCount}</dd>
              </div>
              <div>
                <dt>Tasks This Week</dt>
                <dd>{data.tasks.filter((task) => task.status === "this_week").length}</dd>
              </div>
              <div>
                <dt>Blocked Tasks</dt>
                <dd>{metrics.blockedCount}</dd>
              </div>
              <div>
                <dt>Ideas Captured</dt>
                <dd>{metrics.ideasCaptured}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="panel quick-capture-card">
        <PanelHeader title="Quick Capture" icon={Plus} />
        <div className="capture-options">
          <button type="button" onClick={onCapture}>Task</button>
          <button type="button" onClick={onCapture}>Idea</button>
          <button type="button" onClick={onCapture}>Resource</button>
        </div>
        <button className="primary-action" onClick={onCapture} type="button">
          <Plus size={17} />
          Open Capture
        </button>
      </section>

      <section className="panel">
        <PanelHeader title="Weekly Progress" icon={CheckCircle2} />
        <div className="weekly-task-total">
          <strong>{metrics.completedCount}</strong>
          <span>Tasks completed</span>
        </div>
        <div className="progress-breakdown">
          {data.areas.slice(0, 4).map((area) => {
            const count = data.tasks.filter(
              (task) => task.areaId === area.id && task.status === "done",
            ).length;
            return (
              <div key={area.id}>
                <span>
                  <i style={{ background: area.color }} />
                  {area.name}
                </span>
                <strong>{count}</strong>
              </div>
            );
          })}
        </div>
        <button className="panel-link" type="button">View full report</button>
      </section>

      <section className="panel">
        <PanelHeader title="Time Tracking This Week" icon={Clock3} />
        <div className="time-total">{minutesToHours(metrics.totalMinutes)}</div>
        <div className="time-bars">
          {data.projects.slice(0, 4).map((project) => (
            <div className="time-bar-row" key={project.id}>
              <span>{project.name}</span>
              <div>
                <i style={{ width: `${Math.max(8, project.progressPercent)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelHeader title="Quick Stats" icon={BarChart3} />
        <div className="metric-stack">
          <Metric label="Active tasks" value={metrics.activeCount} tone="purple" />
          <Metric label="Projects" value={metrics.activeProjectsCount} tone="blue" />
          <Metric label="Captured ideas" value={metrics.ideasCaptured} tone="green" />
        </div>
      </section>

      <section className="panel span-3">
        <PanelHeader title="Active Projects" icon={FolderKanban} />
        <div className="project-strip">
          {data.projects.map((project) => (
            <button className="project-card" key={project.id} onClick={() => onSelectProject(project.id)} type="button">
              <span className={`health ${project.health}`}>{project.health.replace("_", " ")}</span>
              <strong>{project.name}</strong>
              <small>{lookupWorkspace(data, project.workspaceId)?.name}</small>
              <Progress percent={project.progressPercent} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
```

Commit message: `refactor: extract CommandCenter from App.tsx`

### Task 10: DailyPlanner

**Files:** Create `src/components/views/DailyPlanner.tsx`

**Interfaces:** Consumes `AppData`, `DailyPlanInput` from `../../types`; `ListItems`, `PanelHeader`, `Timeline` from `../ui/primitives`. Produces `DailyPlanner({ data, onSavePlan, isSaving })`.

```tsx
import { CalendarDays, Inbox, ListChecks, Sparkles } from "lucide-react";
import { format } from "date-fns";
import type { AppData, DailyPlanInput } from "../../types";
import { ListItems, PanelHeader, Timeline } from "../ui/primitives";

export function DailyPlanner({
  data,
  onSavePlan,
  isSaving,
}: {
  data: AppData;
  onSavePlan: (input: DailyPlanInput) => void;
  isSaving: boolean;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const storedPlan = data.dailyPlans.find((plan) => plan.planDate === today);

  const derived = {
    mustDo: data.tasks
      .filter((task) => task.priority === "high" && task.status !== "done")
      .slice(0, 4),
    shouldDo: data.tasks
      .filter((task) => task.priority === "medium" && task.status !== "done")
      .slice(0, 4),
    couldDo: data.tasks
      .filter((task) => task.priority === "low" && task.status !== "done")
      .slice(0, 4),
  };

  const titleFor = (id: string) =>
    data.tasks.find((task) => task.id === id)?.title || "Unknown task";

  const groups: Record<string, string[]> = storedPlan
    ? {
        "Must Do": storedPlan.mustDoTaskIds.map(titleFor),
        "Should Do": storedPlan.shouldDoTaskIds.map(titleFor),
        "Could Do": storedPlan.couldDoTaskIds.map(titleFor),
      }
    : {
        "Must Do": derived.mustDo.map((task) => task.title),
        "Should Do": derived.shouldDo.map((task) => task.title),
        "Could Do": derived.couldDo.map((task) => task.title),
      };

  const handleSave = () => {
    onSavePlan({
      planDate: today,
      mustDoTaskIds: derived.mustDo.map((task) => task.id),
      shouldDoTaskIds: derived.shouldDo.map((task) => task.id),
      couldDoTaskIds: derived.couldDo.map((task) => task.id),
    });
  };

  return (
    <div className="content-grid">
      {Object.entries(groups).map(([title, items]) => (
        <section className="panel" key={title}>
          <PanelHeader title={title} icon={ListChecks} />
          <ListItems items={items} empty="No tasks here." />
        </section>
      ))}
      <section className="panel span-2">
        <PanelHeader title="Schedule and Deadlines" icon={CalendarDays} />
        <Timeline data={data} />
      </section>
      <section className="panel">
        <PanelHeader title="Unplanned Inbox Items" icon={Inbox} />
        <ListItems
          items={data.inboxItems
            .filter((item) => item.status === "new")
            .map((item) => item.title)}
        />
        <button
          className="secondary-action"
          type="button"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Sparkles size={16} />
          {storedPlan ? "Update today's plan" : "Save today's plan"}
        </button>
      </section>
    </div>
  );
}
```

Commit message: `refactor: extract DailyPlanner from App.tsx`

### Task 11: WeeklyPlanner

**Files:** Create `src/components/views/WeeklyPlanner.tsx`

**Interfaces:** Consumes `AppData`, `WeeklyPlanInput` from `../../types`; `ListItems`, `PanelHeader`, `Progress` from `../ui/primitives`. Produces `WeeklyPlanner({ data, onSaveWeek, isSaving })`.

```tsx
import { CalendarDays, FolderKanban, LifeBuoy, Sparkles, Target } from "lucide-react";
import { format, startOfWeek } from "date-fns";
import type { AppData, WeeklyPlanInput } from "../../types";
import { ListItems, PanelHeader, Progress } from "../ui/primitives";

export function WeeklyPlanner({
  data,
  onSaveWeek,
  isSaving,
}: {
  data: AppData;
  onSaveWeek: (input: WeeklyPlanInput) => void;
  isSaving: boolean;
}) {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const storedPlan = data.weeklyPlans.find((plan) => plan.weekStart === weekStart);

  const derivedOutcomes = [
    "Persistent LIVAL OS MVP is usable from desktop and mobile.",
    "Client delivery work remains visible against personal projects.",
    "Weekly evidence is generated from real stored activity.",
  ];
  const derivedFocusAreas = data.areas.slice(0, 4).map((area) => area.name as string);
  const derivedOpenLoops = data.tasks
    .filter((task) => task.status === "blocked")
    .map((task) => task.title);

  const outcomes = storedPlan ? storedPlan.outcomes : derivedOutcomes;
  const focusAreas = storedPlan ? storedPlan.focusAreas : derivedFocusAreas;
  const openLoops = storedPlan ? storedPlan.openLoops : derivedOpenLoops;

  const handleSave = () => {
    onSaveWeek({
      weekStart,
      outcomes: derivedOutcomes,
      focusAreas: derivedFocusAreas,
      openLoops: derivedOpenLoops,
    });
  };

  return (
    <div className="content-grid">
      <section className="panel span-2">
        <PanelHeader title="This Week's Outcomes" icon={Target} />
        <ListItems items={outcomes} empty="No outcomes set." />
        <button
          className="secondary-action"
          type="button"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Target size={16} />
          {storedPlan ? "Update this week" : "Save this week"}
        </button>
      </section>
      <section className="panel">
        <PanelHeader title="Focus Areas" icon={Sparkles} />
        <ListItems items={focusAreas} empty="No focus areas." />
      </section>
      <section className="panel span-2">
        <PanelHeader title="Project Priorities" icon={FolderKanban} />
        <div className="table-list">
          {data.projects.map((project) => (
            <div className="table-row" key={project.id}>
              <strong>{project.name}</strong>
              <span>{project.priority}</span>
              <Progress percent={project.progressPercent} />
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <PanelHeader title="Open Loops" icon={LifeBuoy} />
        <ListItems items={openLoops} empty="No blocked work." />
      </section>
      <section className="panel span-3">
        <PanelHeader title="Weekly Calendar Overview" icon={CalendarDays} />
        <div className="week-grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
            <div className="day-cell" key={day}>
              <strong>{day}</strong>
              <span>{index < 5 ? `${index + 1} focus block` : "Light"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

Commit message: `refactor: extract WeeklyPlanner from App.tsx`

### Task 12: BoardView

**Files:** Create `src/components/views/BoardView.tsx`

**Interfaces:** Consumes `AppData`, `TaskStatus` from `../../types`; `taskStatusLabels`, `tasksByStatus` from `../../lib/metrics`; `statusOrder` from `../../lib/view-helpers`; `Priority` from `../ui/primitives`. Produces `BoardView({ data, allData, filterArea, filterPriority, onFilterArea, onFilterPriority, onSelectTask, onStatusChange })`.

```tsx
import type { AppData, TaskStatus } from "../../types";
import { taskStatusLabels, tasksByStatus } from "../../lib/metrics";
import { statusOrder } from "../../lib/view-helpers";
import { Priority } from "../ui/primitives";

export function BoardView({
  data,
  allData,
  filterArea,
  filterPriority,
  onFilterArea,
  onFilterPriority,
  onSelectTask,
  onStatusChange,
}: {
  data: AppData;
  allData: AppData;
  filterArea: string;
  filterPriority: string;
  onFilterArea: (areaId: string) => void;
  onFilterPriority: (priority: string) => void;
  onSelectTask: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  return (
    <div className="board-page">
      <div className="filter-bar">
        <select value={filterArea} onChange={(event) => onFilterArea(event.target.value)} aria-label="Filter by area">
          <option value="all">All areas</option>
          {allData.areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
        <select value={filterPriority} onChange={(event) => onFilterPriority(event.target.value)} aria-label="Filter by priority">
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select aria-label="Filter by workspace">
          <option>All workspaces</option>
          {allData.workspaces.map((workspace) => (
            <option key={workspace.id}>{workspace.name}</option>
          ))}
        </select>
        <select aria-label="Filter by project">
          <option>All projects</option>
          {allData.projects.map((project) => (
            <option key={project.id}>{project.name}</option>
          ))}
        </select>
        <select aria-label="Filter by label">
          <option>All labels</option>
          <option>client</option>
          <option>automation</option>
          <option>mvp</option>
        </select>
        <select aria-label="Filter by due date">
          <option>Any due date</option>
          <option>Today</option>
          <option>This week</option>
          <option>Overdue</option>
        </select>
      </div>
      <div className="kanban">
        {tasksByStatus(data).map((column) => (
          <section className="kanban-column" key={column.status}>
            <header>
              <strong>{column.label}</strong>
              <span>{column.tasks.length}</span>
            </header>
            {column.tasks.map((task) => (
              <article className="task-card" key={task.id}>
                <button onClick={() => onSelectTask(task.id)} type="button">
                  <strong>{task.title}</strong>
                  <span>{task.description}</span>
                </button>
                <div className="task-card-footer">
                  <Priority priority={task.priority} />
                  <select
                    value={task.status}
                    onChange={(event) =>
                      onStatusChange(task.id, event.target.value as TaskStatus)
                    }
                    aria-label={`Change status for ${task.title}`}
                  >
                    {statusOrder.map((status) => (
                      <option key={status} value={status}>
                        {taskStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
```

Commit message: `refactor: extract BoardView from App.tsx`

### Task 13: ProjectsView

**Files:** Create `src/components/views/ProjectsView.tsx`

**Interfaces:** Consumes `AppData` from `../../types`; `minutesToHours`, `projectTime` from `../../lib/metrics`; `lookupWorkspace` from `../../lib/view-helpers`; `PanelHeader`, `Progress` from `../ui/primitives`. Produces `ProjectsView({ data, onSelectProject })`.

```tsx
import { FolderKanban } from "lucide-react";
import type { AppData } from "../../types";
import { minutesToHours, projectTime } from "../../lib/metrics";
import { lookupWorkspace } from "../../lib/view-helpers";
import { PanelHeader, Progress } from "../ui/primitives";

export function ProjectsView({
  data,
  onSelectProject,
}: {
  data: AppData;
  onSelectProject: (projectId: string) => void;
}) {
  return (
    <div className="content-grid">
      {data.areas.map((area) => {
        const areaProjects = data.projects.filter((project) => project.areaId === area.id);
        if (!areaProjects.length) return null;
        return (
          <section className="panel span-3" key={area.id}>
            <PanelHeader title={area.name} icon={FolderKanban} />
            <div className="project-grid">
              {areaProjects.map((project) => (
                <button className="project-card detailed" key={project.id} onClick={() => onSelectProject(project.id)} type="button">
                  <span className={`health ${project.health}`}>{project.health.replace("_", " ")}</span>
                  <strong>{project.name}</strong>
                  <small>{lookupWorkspace(data, project.workspaceId)?.name}</small>
                  <p>{project.goal}</p>
                  <Progress percent={project.progressPercent} />
                  <span>{data.tasks.filter((task) => task.projectId === project.id && task.status !== "done").length} active tasks</span>
                  <span>{minutesToHours(projectTime(data, project.id))} tracked</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

Commit message: `refactor: extract ProjectsView from App.tsx`

### Task 14: ProjectDetail

**Files:** Create `src/components/views/ProjectDetail.tsx`

**Interfaces:** Consumes `AppData`, `Project` from `../../types`; `minutesToHours`, `projectTime`, `taskStatusLabels` from `../../lib/metrics`; `ListItems`, `Metric`, `PanelHeader`, `Priority`, `Progress` from `../ui/primitives`. Produces `ProjectDetail({ data, project, onSelectTask })`.

```tsx
import { Brain, CalendarDays, Clock3, Link2, ListChecks, Sparkles } from "lucide-react";
import type { AppData, Project } from "../../types";
import { minutesToHours, projectTime, taskStatusLabels } from "../../lib/metrics";
import { ListItems, Metric, PanelHeader, Priority, Progress } from "../ui/primitives";

export function ProjectDetail({
  data,
  project,
  onSelectTask,
}: {
  data: AppData;
  project: Project;
  onSelectTask: (taskId: string) => void;
}) {
  const tasks = data.tasks.filter((task) => task.projectId === project.id);
  const resources = data.resources.filter((resource) => resource.projectId === project.id);
  const events = data.activityEvents.filter((event) => event.entityId === project.id || tasks.some((task) => task.id === event.entityId));

  return (
    <div className="detail-layout">
      <section className="panel detail-hero">
        <span className={`health ${project.health}`}>{project.health.replace("_", " ")}</span>
        <h2>{project.name}</h2>
        <p>{project.goal}</p>
        <Progress percent={project.progressPercent} />
        <div className="detail-meta">
          <Metric label="Tasks" value={tasks.length} tone="purple" />
          <Metric label="Time" value={minutesToHours(projectTime(data, project.id))} tone="blue" />
          <Metric label="Target" value={project.targetDate} tone="green" />
        </div>
      </section>
      <section className="panel">
        <PanelHeader title="Tasks" icon={ListChecks} />
        <div className="table-list">
          {tasks.map((task) => (
            <button className="table-row clickable" key={task.id} onClick={() => onSelectTask(task.id)} type="button">
              <strong>{task.title}</strong>
              <span>{taskStatusLabels[task.status]}</span>
              <Priority priority={task.priority} />
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <PanelHeader title="Timeline" icon={CalendarDays} />
        <ListItems items={[`Started ${project.startDate}`, `Target ${project.targetDate}`, `${project.progressPercent}% complete`]} />
      </section>
      <section className="panel">
        <PanelHeader title="Time" icon={Clock3} />
        <ListItems items={data.timeEntries.filter((entry) => entry.projectId === project.id).map((entry) => `${minutesToHours(entry.durationMinutes)} - ${entry.description}`)} empty="No time tracked yet." />
      </section>
      <section className="panel">
        <PanelHeader title="Resources" icon={Link2} />
        <ListItems items={resources.map((resource) => resource.title)} empty="No resources attached." />
      </section>
      <section className="panel">
        <PanelHeader title="Notes" icon={Brain} />
        <ListItems items={[project.description, "Manual notes live here until automation capture is wired."]} />
      </section>
      <section className="panel">
        <PanelHeader title="Activity" icon={Sparkles} />
        <ListItems items={events.map((event) => event.message)} empty="No activity yet." />
      </section>
    </div>
  );
}
```

Commit message: `refactor: extract ProjectDetail from App.tsx`

### Task 15: TaskDetail

**Files:** Create `src/components/views/TaskDetail.tsx`

**Interfaces:** Consumes `AppData`, `Task`, `TaskStatus` from `../../types`; `minutesToHours`, `taskStatusLabels` from `../../lib/metrics`; `statusOrder` from `../../lib/view-helpers`; `ListItems`, `Metric`, `PanelHeader`, `Priority` from `../ui/primitives`. Produces `TaskDetail({ data, task, onStatusChange, onAddNote, isSaving })`.

```tsx
import { useState } from "react";
import { Brain, Link2, ListChecks, Plus, Sparkles } from "lucide-react";
import type { AppData, Task, TaskStatus } from "../../types";
import { minutesToHours, taskStatusLabels } from "../../lib/metrics";
import { statusOrder } from "../../lib/view-helpers";
import { ListItems, Metric, PanelHeader, Priority } from "../ui/primitives";

export function TaskDetail({
  data,
  task,
  onStatusChange,
  onAddNote,
  isSaving,
}: {
  data: AppData;
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onAddNote: (taskId: string, body: string) => void;
  isSaving: boolean;
}) {
  const [note, setNote] = useState("");
  const updates = data.taskUpdates.filter((update) => update.taskId === task.id);

  const handleAddNote = () => {
    const body = note.trim();
    if (!body) return;
    onAddNote(task.id, body);
    setNote("");
  };

  return (
    <div className="detail-layout">
      <section className="panel detail-hero">
        <Priority priority={task.priority} />
        <h2>{task.title}</h2>
        <p>{task.description}</p>
        <div className="detail-meta">
          <Metric label="Status" value={taskStatusLabels[task.status]} tone="purple" />
          <Metric label="Estimate" value={minutesToHours(task.estimatedMinutes)} tone="blue" />
          <Metric label="Due" value={task.dueDate || ("Unset" as string)} tone="green" />
        </div>
        <select
          value={task.status}
          onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}
        >
          {statusOrder.map((status) => (
            <option key={status} value={status}>
              {taskStatusLabels[status]}
            </option>
          ))}
        </select>
      </section>
      <section className="panel">
        <PanelHeader title="Subtasks" icon={ListChecks} />
        <ListItems items={["Define smallest next action", "Confirm required context", "Mark done when evidence exists"]} />
      </section>
      <section className="panel">
        <PanelHeader title="Files and Links" icon={Link2} />
        <ListItems
          items={data.resources
            .filter((resource) => resource.projectId === task.projectId)
            .map((resource) => resource.title)}
          empty="No linked resources."
        />
      </section>
      <section className="panel">
        <PanelHeader title="Notes" icon={Brain} />
        <ListItems
          items={updates.length ? updates.map((update) => update.body) : [task.description || "No notes yet."]}
          empty="No notes yet."
        />
        <textarea
          className="note-input"
          placeholder="Add a note..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <button
          className="secondary-action"
          type="button"
          onClick={handleAddNote}
          disabled={isSaving}
        >
          <Plus size={16} />
          Add note
        </button>
      </section>
      <section className="panel">
        <PanelHeader title="Activity" icon={Sparkles} />
        <ListItems
          items={data.activityEvents
            .filter((event) => event.entityId === task.id)
            .map((event) => event.message)}
          empty="No activity yet."
        />
      </section>
    </div>
  );
}
```

Commit message: `refactor: extract TaskDetail from App.tsx`

### Task 16: InboxView

**Files:** Create `src/components/views/InboxView.tsx`

**Interfaces:** Consumes `AppData`, `InboxItem` from `../../types`; `InboxConversionTarget` from `../../lib/repository`; `TabbedList` from `../ui/primitives`. Produces `InboxView({ data, isSaving, onConvert, onStatusChange })`.

```tsx
import type { AppData, InboxItem } from "../../types";
import type { InboxConversionTarget } from "../../lib/repository";
import { TabbedList } from "../ui/primitives";

export function InboxView({
  data,
  isSaving,
  onConvert,
  onStatusChange,
}: {
  data: AppData;
  isSaving: boolean;
  onConvert: (inboxId: string, target: InboxConversionTarget) => void;
  onStatusChange: (inboxId: string, status: InboxItem["status"]) => void;
}) {
  const tabs = ["all", "email", "appointment", "idea", "resource"];
  return (
    <TabbedList
      tabs={tabs}
      items={data.inboxItems}
      getTab={(item) => item.type}
      render={(item) => (
        <>
          <strong>{item.title}</strong>
          <span>{item.body}</span>
          <div className="row-actions">
            <button disabled={isSaving} onClick={() => onConvert(item.id, "task")} type="button">
              Convert to task
            </button>
            <button disabled={isSaving} onClick={() => onConvert(item.id, "project")} type="button">
              Convert to project
            </button>
            <button disabled={isSaving} onClick={() => onConvert(item.id, "resource")} type="button">
              Save as resource
            </button>
            <button disabled={isSaving} onClick={() => onStatusChange(item.id, "archived")} type="button">
              Archive
            </button>
            <button disabled={isSaving} onClick={() => onStatusChange(item.id, "reviewed")} type="button">
              Mark reviewed
            </button>
          </div>
        </>
      )}
    />
  );
}
```

Commit message: `refactor: extract InboxView from App.tsx`

### Task 17: BrainDumpView, ResourcesView, ReportsView, ArchiveView, SettingsView

These five views are small and independent of each other — create all five files in this one task.

**Files:**
- Create: `src/components/views/BrainDumpView.tsx`
- Create: `src/components/views/ResourcesView.tsx`
- Create: `src/components/views/ReportsView.tsx`
- Create: `src/components/views/ArchiveView.tsx`
- Create: `src/components/views/SettingsView.tsx`

**Interfaces:**
- `BrainDumpView({ data })`, `ResourcesView({ data })` consume `TabbedList` from `../ui/primitives`.
- `ReportsView({ data, metrics })` consumes `dashboardMetrics`, `minutesToHours`, `projectTime` from `../../lib/metrics`; `ListItems`, `Metric`, `PanelHeader` from `../ui/primitives`.
- `ArchiveView({ data })` consumes `PanelHeader` from `../ui/primitives`.
- `SettingsView({ data, mode, userEmail, isSaving, onReload, onReset, onSignOut })` consumes `ListItems`, `PanelHeader`, `StatusPill` from `../ui/primitives`.

```tsx
// src/components/views/BrainDumpView.tsx
import type { AppData } from "../../types";
import { TabbedList } from "../ui/primitives";

export function BrainDumpView({ data }: { data: AppData }) {
  return (
    <TabbedList
      tabs={["all", "idea", "thought", "someday", "link"]}
      items={data.brainDumps}
      getTab={(item) => item.category}
      render={(item) => (
        <>
          <strong>{item.title}</strong>
          <span>{item.body}</span>
        </>
      )}
    />
  );
}
```

```tsx
// src/components/views/ResourcesView.tsx
import type { AppData } from "../../types";
import { TabbedList } from "../ui/primitives";

export function ResourcesView({ data }: { data: AppData }) {
  const categories = ["all", "AI / Codex / Claude", "Databricks", "Job Search", "Home Assistant", "Consulting", "Travel", "Marketing", "Finance", "Other"];
  return (
    <TabbedList
      tabs={categories}
      items={data.resources}
      getTab={(item) => item.category}
      render={(item) => (
        <>
          <strong>{item.title}</strong>
          <span>{item.description}</span>
          <a href={item.url} target="_blank" rel="noreferrer">
            {item.url}
          </a>
        </>
      )}
    />
  );
}
```

```tsx
// src/components/views/ReportsView.tsx
import { BarChart3, CheckCircle2, Clock3, FolderKanban, Target } from "lucide-react";
import type { AppData } from "../../types";
import { dashboardMetrics, minutesToHours, projectTime } from "../../lib/metrics";
import { ListItems, Metric, PanelHeader } from "../ui/primitives";

export function ReportsView({
  data,
  metrics,
}: {
  data: AppData;
  metrics: ReturnType<typeof dashboardMetrics>;
}) {
  const latest = data.weeklySnapshots[0];
  return (
    <div className="content-grid">
      <section className="panel span-2">
        <PanelHeader title="Weekly Summary" icon={BarChart3} />
        <p>{latest?.summary}</p>
        <div className="detail-meta">
          <Metric label="Tasks completed" value={metrics.completedCount} tone="green" />
          <Metric label="Hours worked" value={minutesToHours(metrics.totalMinutes)} tone="blue" />
          <Metric label="Projects advanced" value={latest?.projectsAdvanced || 0} tone="purple" />
          <Metric label="Ideas captured" value={metrics.ideasCaptured} tone="green" />
        </div>
      </section>
      <section className="panel">
        <PanelHeader title="Weekly Health" icon={Target} />
        <div className="weekly-task-total">
          <strong>{latest?.momentumScore || 0}</strong>
          <span>Overall score</span>
        </div>
      </section>
      <section className="panel">
        <PanelHeader title="Time Allocation" icon={Clock3} />
        <ListItems items={data.projects.map((project) => `${project.name}: ${minutesToHours(projectTime(data, project.id))}`)} />
      </section>
      <section className="panel">
        <PanelHeader title="Project Investment" icon={FolderKanban} />
        <ListItems items={data.projects.map((project) => `${project.progressPercent}% - ${project.name}`)} />
      </section>
      <section className="panel span-2">
        <PanelHeader title="Weekly Win Log" icon={CheckCircle2} />
        <ListItems items={data.activityEvents.map((event) => event.message)} />
      </section>
    </div>
  );
}
```

```tsx
// src/components/views/ArchiveView.tsx
import { Archive } from "lucide-react";
import type { AppData } from "../../types";
import { PanelHeader } from "../ui/primitives";

export function ArchiveView({ data }: { data: AppData }) {
  return (
    <section className="panel">
      <PanelHeader title="Completed Weekly Snapshots" icon={Archive} />
      <div className="table-list">
        {data.weeklySnapshots.map((snapshot) => (
          <div className="table-row" key={snapshot.id}>
            <strong>
              {snapshot.weekStart} to {snapshot.weekEnd}
            </strong>
            <span>{snapshot.tasksCompleted} tasks</span>
            <span>{snapshot.hoursTracked} hours</span>
            <span>{snapshot.momentumScore} score</span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

```tsx
// src/components/views/SettingsView.tsx
import { Database, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import type { AppData } from "../../types";
import { ListItems, PanelHeader, StatusPill } from "../ui/primitives";

export function SettingsView({
  data,
  mode,
  userEmail,
  isSaving,
  onReload,
  onReset,
  onSignOut,
}: {
  data: AppData;
  mode: "demo" | "supabase";
  userEmail?: string;
  isSaving: boolean;
  onReload: () => void;
  onReset: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="content-grid">
      <section className="panel">
        <PanelHeader title="Private Login" icon={LockKeyhole} />
        <p>
          {mode === "supabase"
            ? `Signed in${userEmail ? ` as ${userEmail}` : ""}. Data is protected by Supabase Auth and RLS.`
            : "Local demo mode is active until Supabase keys are provided."}
        </p>
        <StatusPill active={mode === "supabase"} label={mode === "supabase" ? "Supabase live" : "Local demo mode"} />
        {mode === "supabase" && (
          <button className="secondary-action" disabled={isSaving} onClick={onSignOut} type="button">
            <LockKeyhole size={16} />
            Sign out
          </button>
        )}
      </section>
      <section className="panel">
        <PanelHeader title="Persistence" icon={Database} />
        <ListItems
          items={[
            `${data.areas.length} areas`,
            `${data.projects.length} projects`,
            `${data.tasks.length} tasks`,
            `${data.activityEvents.length} activity events`,
          ]}
        />
        <button className="secondary-action" disabled={isSaving} onClick={onReload} type="button">
          <RotateCcw size={16} />
          Reload data
        </button>
        {mode === "demo" && (
          <button className="secondary-action danger" disabled={isSaving} onClick={onReset} type="button">
            <RotateCcw size={16} />
            Reset demo data
          </button>
        )}
        {mode === "supabase" && (
          <button className="secondary-action" disabled type="button">
          <RotateCcw size={16} />
            Remote reset disabled
          </button>
        )}
      </section>
      <section className="panel span-2">
        <PanelHeader title="Automation-ready Hooks" icon={Sparkles} />
        <ListItems
          items={[
            "Gmail and n8n captures can insert into inbox_items.",
            "Siri Shortcuts can post raw thoughts into brain_dumps.",
            "Codex and Claude Code time can append time_entries.",
            "Weekly reports are derived from tasks, time, ideas, resources, and activity_events.",
          ]}
        />
      </section>
    </div>
  );
}
```

Commit message: `refactor: extract BrainDumpView, ResourcesView, ReportsView, ArchiveView, SettingsView from App.tsx`

---

### Task 18: Rewire App.tsx (sequential — depends on Tasks 1–17)

**Files:**
- Modify: `src/App.tsx` (full rewrite — replace entire file contents)

**Interfaces:** Consumes every component produced by Tasks 1–17. Produces: `App` (default export, unchanged signature, used by `src/main.tsx`).

- [ ] **Step 1: Confirm every Stage 1/2 file exists**

Run: `ls src/lib/view-helpers.ts src/components/ui/primitives.tsx src/components/{AuthGate,LoadingScreen,Sidebar,TopBar,BottomNav,CapturePanel}.tsx src/components/views/{CommandCenter,DailyPlanner,WeeklyPlanner,BoardView,ProjectsView,ProjectDetail,TaskDetail,InboxView,BrainDumpView,ResourcesView,ReportsView,ArchiveView,SettingsView}.tsx`
Expected: all 19 paths print with no "No such file" errors.

- [ ] **Step 2: Replace `src/App.tsx` in full**

```tsx
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  AppData,
  CaptureDraft,
  DailyPlanInput,
  InboxItem,
  TaskStatus,
  ViewKey,
  WeeklyPlanInput,
} from "./types";
import { seedData } from "./data/seed";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import type {
  AppRepository,
  InboxConversionTarget,
} from "./lib/repository";
import {
  LocalDemoRepository,
  SupabaseRepository,
} from "./lib/repository";
import { dashboardMetrics } from "./lib/metrics";
import { AuthGate } from "./components/AuthGate";
import { LoadingScreen } from "./components/LoadingScreen";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/BottomNav";
import { CapturePanel } from "./components/CapturePanel";
import { CommandCenter } from "./components/views/CommandCenter";
import { DailyPlanner } from "./components/views/DailyPlanner";
import { WeeklyPlanner } from "./components/views/WeeklyPlanner";
import { BoardView } from "./components/views/BoardView";
import { ProjectsView } from "./components/views/ProjectsView";
import { ProjectDetail } from "./components/views/ProjectDetail";
import { TaskDetail } from "./components/views/TaskDetail";
import { InboxView } from "./components/views/InboxView";
import { BrainDumpView } from "./components/views/BrainDumpView";
import { ResourcesView } from "./components/views/ResourcesView";
import { ReportsView } from "./components/views/ReportsView";
import { ArchiveView } from "./components/views/ArchiveView";
import { SettingsView } from "./components/views/SettingsView";

const initialDraft: CaptureDraft = {
  title: "",
  body: "",
  type: "task",
  areaId: "",
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!hasSupabaseConfig);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) return;

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  if (hasSupabaseConfig && !authReady) {
    return <LoadingScreen title="Restoring private session" />;
  }

  if (hasSupabaseConfig && !session) {
    return <AuthGate />;
  }

  return <LivalShell session={session} onSignOut={signOut} />;
}

function LivalShell({
  session,
  onSignOut,
}: {
  session: Session | null;
  onSignOut: () => Promise<void>;
}) {
  const repository: AppRepository = useMemo(() => {
    if (hasSupabaseConfig && supabase && session?.user) {
      return new SupabaseRepository(supabase, session.user);
    }
    return new LocalDemoRepository();
  }, [session?.user]);

  const [data, setData] = useState<AppData>(seedData);
  const [activeView, setActiveView] = useState<ViewKey>("command");
  const [selectedProjectId, setSelectedProjectId] = useState("project-lival");
  const [selectedTaskId, setSelectedTaskId] = useState("task-1");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [draft, setDraft] = useState<CaptureDraft>(initialDraft);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [filterArea, setFilterArea] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const reloadData = useCallback(async () => {
    setIsLoadingData(true);
    setAppError(null);
    try {
      const nextData = await repository.loadData();
      setData(nextData);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Unable to load LIVAL OS data.");
    } finally {
      setIsLoadingData(false);
    }
  }, [repository]);

  useEffect(() => {
    void reloadData();
  }, [reloadData]);

  useEffect(() => {
    if (!draft.areaId && data.areas[0]) {
      setDraft((current) => ({ ...current, areaId: data.areas[0].id }));
    }
  }, [data.areas, draft.areaId]);

  useEffect(() => {
    if (!data.projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(data.projects[0]?.id || "");
    }
    if (!data.tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(data.tasks[0]?.id || "");
    }
  }, [data.projects, data.tasks, selectedProjectId, selectedTaskId]);

  const metrics = useMemo(() => dashboardMetrics(data), [data]);
  const selectedProject =
    data.projects.find((project) => project.id === selectedProjectId) ||
    data.projects[0];
  const selectedTask =
    data.tasks.find((task) => task.id === selectedTaskId) || data.tasks[0];

  const filteredTasks = data.tasks.filter((task) => {
    const areaMatch = filterArea === "all" || task.areaId === filterArea;
    const priorityMatch = filterPriority === "all" || task.priority === filterPriority;
    return areaMatch && priorityMatch;
  });

  const filteredData = { ...data, tasks: filteredTasks };

  const goTo = (view: ViewKey) => {
    setActiveView(view);
    setMobileNavOpen(false);
  };

  const submitCapture = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setIsSaving(true);
    setAppError(null);
    try {
      const nextData = await repository.createCapture(draft, data);
      setData(nextData);
      setDraft({ ...initialDraft, areaId: draft.areaId });
      setCaptureOpen(false);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Unable to save capture.");
    } finally {
      setIsSaving(false);
    }
  };

  const changeTaskStatus = async (taskId: string, status: TaskStatus) => {
    setIsSaving(true);
    setAppError(null);
    try {
      const nextData = await repository.updateTaskStatus(data, taskId, status);
      setData(nextData);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Unable to update task.");
    } finally {
      setIsSaving(false);
    }
  };

  const savePlan = async (input: DailyPlanInput) => {
    setIsSaving(true);
    setAppError(null);
    try {
      const nextData = await repository.upsertDailyPlan(data, input);
      setData(nextData);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Unable to save daily plan.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveWeek = async (input: WeeklyPlanInput) => {
    setIsSaving(true);
    setAppError(null);
    try {
      const nextData = await repository.upsertWeeklyPlan(data, input);
      setData(nextData);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Unable to save weekly plan.");
    } finally {
      setIsSaving(false);
    }
  };

  const addTaskUpdate = async (taskId: string, body: string) => {
    setIsSaving(true);
    setAppError(null);
    try {
      const nextData = await repository.appendTaskUpdate(data, taskId, body);
      setData(nextData);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Unable to add note.");
    } finally {
      setIsSaving(false);
    }
  };

  const changeInboxStatus = async (inboxId: string, status: InboxItem["status"]) => {
    setIsSaving(true);
    setAppError(null);
    try {
      const nextData = await repository.updateInboxStatus(data, inboxId, status);
      setData(nextData);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Unable to update inbox item.");
    } finally {
      setIsSaving(false);
    }
  };

  const convertInbox = async (inboxId: string, target: InboxConversionTarget) => {
    setIsSaving(true);
    setAppError(null);
    try {
      const nextData = await repository.convertInboxItem(data, inboxId, target);
      setData(nextData);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Unable to convert inbox item.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetDemo = async () => {
    if (!repository.resetDemoData) return;
    setIsSaving(true);
    setAppError(null);
    try {
      setData(await repository.resetDemoData());
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Unable to reset demo data.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        mobileNavOpen={mobileNavOpen}
        totalMinutes={metrics.totalMinutes}
        activeProjectsCount={metrics.activeProjectsCount}
        onSelect={goTo}
        onCloseMobileNav={() => setMobileNavOpen(false)}
        onOpenCapture={() => setCaptureOpen(true)}
      />

      <main className="main-shell">
        <TopBar
          activeView={activeView}
          repositoryMode={repository.mode}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenCapture={() => setCaptureOpen(true)}
        />

        {appError && (
          <div className="app-alert" role="alert">
            {appError}
          </div>
        )}

        {isLoadingData ? (
          <LoadingScreen title="Loading command center" embedded />
        ) : (
          <>
            {activeView === "command" && (
              <CommandCenter
                data={data}
                metrics={metrics}
                onCapture={() => setCaptureOpen(true)}
                onOpenBoard={() => goTo("board")}
                onOpenInbox={() => goTo("inbox")}
                onSelectProject={(projectId) => {
                  setSelectedProjectId(projectId);
                  goTo("project-detail");
                }}
                onSelectTask={(taskId) => {
                  setSelectedTaskId(taskId);
                  goTo("task-detail");
                }}
              />
            )}
            {activeView === "daily" && (
              <DailyPlanner data={data} onSavePlan={savePlan} isSaving={isSaving} />
            )}
            {activeView === "weekly" && (
              <WeeklyPlanner data={data} onSaveWeek={saveWeek} isSaving={isSaving} />
            )}
            {activeView === "board" && (
              <BoardView
                data={filteredData}
                allData={data}
                filterArea={filterArea}
                filterPriority={filterPriority}
                onFilterArea={setFilterArea}
                onFilterPriority={setFilterPriority}
                onSelectTask={(taskId) => {
                  setSelectedTaskId(taskId);
                  goTo("task-detail");
                }}
                onStatusChange={changeTaskStatus}
              />
            )}
            {activeView === "projects" && (
              <ProjectsView
                data={data}
                onSelectProject={(projectId) => {
                  setSelectedProjectId(projectId);
                  goTo("project-detail");
                }}
              />
            )}
            {activeView === "project-detail" && selectedProject && (
              <ProjectDetail
                data={data}
                project={selectedProject}
                onSelectTask={(taskId) => {
                  setSelectedTaskId(taskId);
                  goTo("task-detail");
                }}
              />
            )}
            {activeView === "task-detail" && selectedTask && (
              <TaskDetail
                data={data}
                task={selectedTask}
                onStatusChange={changeTaskStatus}
                onAddNote={addTaskUpdate}
                isSaving={isSaving}
              />
            )}
            {activeView === "inbox" && (
              <InboxView
                data={data}
                isSaving={isSaving}
                onConvert={convertInbox}
                onStatusChange={changeInboxStatus}
              />
            )}
            {activeView === "brain-dump" && <BrainDumpView data={data} />}
            {activeView === "resources" && <ResourcesView data={data} />}
            {activeView === "reports" && <ReportsView data={data} metrics={metrics} />}
            {activeView === "archive" && <ArchiveView data={data} />}
            {activeView === "settings" && (
              <SettingsView
                data={data}
                mode={repository.mode}
                userEmail={session?.user.email}
                isSaving={isSaving}
                onReload={reloadData}
                onReset={resetDemo}
                onSignOut={onSignOut}
              />
            )}
          </>
        )}
      </main>

      <BottomNav activeView={activeView} onSelect={goTo} />

      <CapturePanel
        data={data}
        draft={draft}
        isOpen={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onDraft={setDraft}
        isSaving={isSaving}
        onSubmit={submitCapture}
      />
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Verify build, lint, and tests**

Run: `npm run build && npm run lint && npm test`
Expected: `build` succeeds with no type errors (1754-line file is now ~330 lines); `lint` passes (warnings on `react-refresh/only-export-components` in `primitives.tsx`/`view-helpers.ts` are acceptable — that rule is `warn`, not `error`, per `eslint.config.js:23-26`); `test` (vitest, `repository.test.ts` + `storage.test.ts` + `sanity.test.ts`) passes unchanged since none of those test files touch UI components.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: rewire App.tsx to use extracted components

App.tsx shrinks from 1754 to ~330 lines — now orchestration only
(auth, state, handlers, view routing). All view/shell JSX lives in
src/components/*."
```

---

### Task 19: Manual smoke pass + kanban update

**Files:**
- Modify: `docs/superpowers/kanban.html` (flip extraction task statuses to `done`)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: serves on `http://localhost:5173` with no console errors.

- [ ] **Step 2: Manual smoke every view**

In the browser, click through: Command Center, Daily, Weekly, Board (change a task's status via the dropdown), Projects → a project card → Project Detail, a task row → Task Detail (add a note), Inbox (convert an item), Brain Dump, Resources, Reports, Archive, Settings (Reload data). Then resize the viewport below 1180px and confirm: bottom nav appears, hamburger menu opens the sidebar as an overlay, tapping the scrim closes it.
Expected: every view renders identically to before the refactor; no regressions in click targets or data.

- [ ] **Step 3: Update kanban statuses**

In `docs/superpowers/kanban.html`, change `status: 'todo'` → `status: 'done'` for task ids `2-1`, `2-2`, `2-3`, `2-4`, `2-5`, `2-6`, `2-7`, `2-10` (lines ~318–327), and update each task's `notes` field to reference the new file path (e.g. `2-1` → `src/components/Sidebar.tsx`).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/kanban.html
git commit -m "docs: mark Phase 2 App.tsx extraction tasks done on kanban"
```

## Self-Review Notes

- **Spec coverage:** Every component currently inline in `App.tsx` (lines 101–1752 of the pre-refactor file) maps to exactly one Task 1–17 file or stays in the Task 20 `App.tsx` rewrite (App, LivalShell). No JSX/logic is left unaccounted for.
- **Placeholder scan:** none — every task's code block is the verbatim extracted implementation, not a description of one.
- **Type consistency:** prop names/types are unchanged from the current inline call sites in `App.tsx` (verified against the read of lines 425–513 before drafting Task 20), so the Task 20 rewrite's JSX call sites match each extracted component's declared props exactly (e.g. `Sidebar`'s `onSelect`/`onCloseMobileNav`/`onOpenCapture` line up with what `LivalShell` passes).
