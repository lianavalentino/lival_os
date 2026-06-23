import { CalendarDays, Inbox, ListChecks, Sparkles } from "lucide-react";
import { format } from "date-fns";
import type { AppData, DailyPlanInput } from "../../types";
import { ListItems, PanelHeader, Timeline } from "../ui/primitives";

export function DailyPlanner({
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
