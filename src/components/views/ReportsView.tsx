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
