import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Archive,
  BarChart3,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  FolderKanban,
  Home,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  ListChecks,
  LockKeyhole,
  Menu,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { format, startOfWeek } from "date-fns";
import {
  AppData,
  CaptureDraft,
  DailyPlanInput,
  InboxItem,
  Project,
  Task,
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
import {
  dashboardMetrics,
  minutesToHours,
  projectTime,
  taskStatusLabels,
  tasksByStatus,
} from "./lib/metrics";

const navItems: Array<{ key: ViewKey; label: string; icon: typeof Home }> = [
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

const bottomNav = navItems.filter((item) =>
  ["command", "board", "projects", "inbox"].includes(item.key),
);

const statusOrder: TaskStatus[] = [
  "backlog",
  "this_week",
  "in_progress",
  "blocked",
  "done",
];

const initialDraft: CaptureDraft = {
  title: "",
  body: "",
  type: "task",
  areaId: "",
};

const statusTone: Record<TaskStatus, string> = {
  backlog: "neutral",
  this_week: "yellow",
  in_progress: "blue",
  blocked: "red",
  done: "green",
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
                onClick={() => goTo(item.key)}
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
          <strong>{minutesToHours(metrics.totalMinutes)}</strong>
          <span>{metrics.activeProjectsCount} active projects</span>
        </div>

        <button className="primary-action" onClick={() => setCaptureOpen(true)} type="button">
          <Plus size={18} />
          Quick Capture
        </button>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            onClick={() => setMobileNavOpen(true)}
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
              active={repository.mode === "supabase"}
              label={repository.mode === "supabase" ? "Supabase live" : "Demo mode"}
            />
            <div className="search-control">
              <Search size={16} />
              <span>Search anything</span>
            </div>
            <button className="primary-action compact" onClick={() => setCaptureOpen(true)} type="button">
              <Plus size={17} />
              Capture
            </button>
          </div>
        </header>

        {mobileNavOpen && (
          <button
            aria-label="Close navigation"
            className="mobile-scrim"
            onClick={() => setMobileNavOpen(false)}
            type="button"
          />
        )}

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

function AuthGate() {
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

function LoadingScreen({
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

function viewTitle(view: ViewKey) {
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

function viewSubtitle(view: ViewKey) {
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

function CommandCenter({
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

function DailyPlanner({
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

function WeeklyPlanner({
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

function BoardView({
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

function ProjectsView({
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

function ProjectDetail({
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

function TaskDetail({
  data,
  task,
  onStatusChange,
}: {
  data: AppData;
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  return (
    <div className="detail-layout">
      <section className="panel detail-hero">
        <Priority priority={task.priority} />
        <h2>{task.title}</h2>
        <p>{task.description}</p>
        <div className="detail-meta">
          <Metric label="Status" value={taskStatusLabels[task.status]} tone="purple" />
          <Metric label="Estimate" value={minutesToHours(task.estimatedMinutes)} tone="blue" />
          <Metric label="Due" value={task.dueDate || "Unset" as string} tone="green" />
        </div>
        <select value={task.status} onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}>
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
        <ListItems items={data.resources.filter((resource) => resource.projectId === task.projectId).map((resource) => resource.title)} empty="No linked resources." />
      </section>
      <section className="panel">
        <PanelHeader title="Notes" icon={Brain} />
        <ListItems items={[task.description || "No notes yet."]} />
      </section>
      <section className="panel">
        <PanelHeader title="Activity" icon={Sparkles} />
        <ListItems items={data.activityEvents.filter((event) => event.entityId === task.id).map((event) => event.message)} empty="No activity yet." />
      </section>
    </div>
  );
}

function InboxView({
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

function BrainDumpView({ data }: { data: AppData }) {
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

function ResourcesView({ data }: { data: AppData }) {
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

function ReportsView({
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

function ArchiveView({ data }: { data: AppData }) {
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

function SettingsView({
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

function CapturePanel({
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

function BottomNav({
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

function PanelHeader({
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

function Metric({
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

function Progress({ percent }: { percent: number }) {
  return (
    <div className="progress" aria-label={`${percent}% complete`}>
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}

function Priority({ priority }: { priority: Task["priority"] }) {
  return <span className={`priority ${priority}`}>{priority}</span>;
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return <span className={`status-pill ${active ? "active" : ""}`}>{label}</span>;
}

function ListItems({
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

function TabbedList<T>({
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

function Timeline({ data }: { data: AppData }) {
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

function lookupWorkspace(data: AppData, id?: string) {
  return data.workspaces.find((workspace) => workspace.id === id);
}

function lookupProject(data: AppData, id?: string) {
  return data.projects.find((project) => project.id === id);
}

function priorityRank(priority: Task["priority"]) {
  return { high: 0, medium: 1, low: 2 }[priority];
}

export default App;
