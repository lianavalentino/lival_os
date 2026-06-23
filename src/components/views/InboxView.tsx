import type { AppData, InboxItem } from "../../types";
import type { InboxConversionTarget } from "../../lib/repository";
import { TabbedList } from "../ui/primitives";

export function InboxView({
  data,
  isSaving,
  onConvert,
  onStatusChange,
}: {
  data: AppData;
  isSaving: boolean;
  onConvert: (inboxId: string, target: InboxConversionTarget) => void;
  onStatusChange: (inboxId: string, status: InboxItem["status"]) => void;
}) {
  const tabs = ["all", "email", "appointment", "idea", "resource"];
  return (
    <TabbedList
      tabs={tabs}
      items={data.inboxItems}
      getTab={(item) => item.type}
      render={(item) => (
        <>
          <strong>{item.title}</strong>
          <span>{item.body}</span>
          <div className="row-actions">
            <button disabled={isSaving} onClick={() => onConvert(item.id, "task")} type="button">
              Convert to task
            </button>
            <button disabled={isSaving} onClick={() => onConvert(item.id, "project")} type="button">
              Convert to project
            </button>
            <button disabled={isSaving} onClick={() => onConvert(item.id, "resource")} type="button">
              Save as resource
            </button>
            <button disabled={isSaving} onClick={() => onStatusChange(item.id, "archived")} type="button">
              Archive
            </button>
            <button disabled={isSaving} onClick={() => onStatusChange(item.id, "reviewed")} type="button">
              Mark reviewed
            </button>
          </div>
        </>
      )}
    />
  );
}
