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
