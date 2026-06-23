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
