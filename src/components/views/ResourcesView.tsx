import type { AppData } from "../../types";
import { TabbedList } from "../ui/primitives";

export function ResourcesView({ data }: { data: AppData }) {
  const categories = ["all", "AI / Codex / Claude", "Databricks", "Job Search", "Home Assistant", "Consulting", "Travel", "Marketing", "Finance", "Other"];
  return (
    <TabbedList
      tabs={categories}
      items={data.resources}
      getTab={(item) => item.category}
      render={(item) => (
        <>
          <strong>{item.title}</strong>
          <span>{item.description}</span>
          <a href={item.url} target="_blank" rel="noreferrer">
            {item.url}
          </a>
        </>
      )}
    />
  );
}
