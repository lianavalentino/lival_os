import { Database, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import type { AppData } from "../../types";
import { ListItems, PanelHeader, StatusPill } from "../ui/primitives";

export function SettingsView({
  data,
  mode,
  userEmail,
  isSaving,
  onReload,
  onReset,
  onSignOut,
}: {
  data: AppData;
  mode: "demo" | "supabase";
  userEmail?: string;
  isSaving: boolean;
  onReload: () => void;
  onReset: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="content-grid">
      <section className="panel">
        <PanelHeader title="Private Login" icon={LockKeyhole} />
        <p>
          {mode === "supabase"
            ? `Signed in${userEmail ? ` as ${userEmail}` : ""}. Data is protected by Supabase Auth and RLS.`
            : "Local demo mode is active until Supabase keys are provided."}
        </p>
        <StatusPill active={mode === "supabase"} label={mode === "supabase" ? "Supabase live" : "Local demo mode"} />
        {mode === "supabase" && (
          <button className="secondary-action" disabled={isSaving} onClick={onSignOut} type="button">
            <LockKeyhole size={16} />
            Sign out
          </button>
        )}
      </section>
      <section className="panel">
        <PanelHeader title="Persistence" icon={Database} />
        <ListItems
          items={[
            `${data.areas.length} areas`,
            `${data.projects.length} projects`,
            `${data.tasks.length} tasks`,
            `${data.activityEvents.length} activity events`,
          ]}
        />
        <button className="secondary-action" disabled={isSaving} onClick={onReload} type="button">
          <RotateCcw size={16} />
          Reload data
        </button>
        {mode === "demo" && (
          <button className="secondary-action danger" disabled={isSaving} onClick={onReset} type="button">
            <RotateCcw size={16} />
            Reset demo data
          </button>
        )}
        {mode === "supabase" && (
          <button className="secondary-action" disabled type="button">
          <RotateCcw size={16} />
            Remote reset disabled
          </button>
        )}
      </section>
      <section className="panel span-2">
        <PanelHeader title="Automation-ready Hooks" icon={Sparkles} />
        <ListItems
          items={[
            "Gmail and n8n captures can insert into inbox_items.",
            "Siri Shortcuts can post raw thoughts into brain_dumps.",
            "Codex and Claude Code time can append time_entries.",
            "Weekly reports are derived from tasks, time, ideas, resources, and activity_events.",
          ]}
        />
      </section>
    </div>
  );
}
