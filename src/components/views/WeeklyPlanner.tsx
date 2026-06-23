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
