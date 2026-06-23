import type { AppData } from "../../types";
import { TabbedList } from "../ui/primitives";

export function BrainDumpView({ data }: { data: AppData }) {
  return (
    <TabbedList
      tabs={["all", "idea", "thought", "someday", "link"]}
      items={data.brainDumps}
      getTab={(item) => item.category}
      render={(item) => (
        <>
          <strong>{item.title}</strong>
          <span>{item.body}</span>
        </>
      )}
    />
  );
}
