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
