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
