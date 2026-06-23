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
