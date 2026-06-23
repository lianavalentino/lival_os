import { FormEvent } from "react";
import { Plus, X } from "lucide-react";
import type { AppData, CaptureDraft } from "../types";

export function CapturePanel({
  data,
  draft,
  isOpen,
  onClose,
  onDraft,
  isSaving,
  onSubmit,
}: {
  data: AppData;
  draft: CaptureDraft;
  isOpen: boolean;
  onClose: () => void;
  onDraft: (draft: CaptureDraft) => void;
  isSaving: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="drawer-wrap">
      <button className="drawer-scrim" onClick={onClose} type="button" aria-label="Close capture" />
      <aside className="capture-drawer" aria-label="Quick Capture">
        <header>
          <div>
            <h2>Quick Capture</h2>
            <p>Save the thought now. Sort it later.</p>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <form onSubmit={onSubmit}>
          <label>
            Title
            <input value={draft.title} onChange={(event) => onDraft({ ...draft, title: event.target.value })} autoFocus />
          </label>
          <label>
            Type
            <select value={draft.type} onChange={(event) => onDraft({ ...draft, type: event.target.value as CaptureDraft["type"] })}>
              <option value="task">Task</option>
              <option value="idea">Inbox idea</option>
              <option value="resource">Inbox resource</option>
              <option value="email">Email</option>
              <option value="appointment">Appointment</option>
              <option value="note">Note</option>
              <option value="brain">Brain dump</option>
            </select>
          </label>
          <label>
            Area
            <select value={draft.areaId} onChange={(event) => onDraft({ ...draft, areaId: event.target.value })}>
              {data.areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Notes
            <textarea value={draft.body} onChange={(event) => onDraft({ ...draft, body: event.target.value })} rows={6} />
          </label>
          <button className="primary-action" disabled={isSaving} type="submit">
            <Plus size={17} />
            {isSaving ? "Saving..." : "Save Capture"}
          </button>
        </form>
      </aside>
    </div>
  );
}
