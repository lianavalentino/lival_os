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
