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
