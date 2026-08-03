import { FormEvent, useState } from "react";
import { Database, KeyRound, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import type { AppData } from "../../types";
import { supabase } from "../../lib/supabase";
import { validateNewPassword } from "../../lib/password";
import { ListItems, PanelHeader, StatusPill } from "../ui/primitives";

/**
 * Setting a password from inside the app matters more than it looks: without it,
 * the only route back into a locked-out account is an emailed magic link, and
 * Supabase's built-in SMTP caps those at a couple per hour. On 2026-08-03 that
 * combination locked the account out for over an hour.
 */
function PasswordPanel() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = validateNewPassword(password, confirmation);
    if (problem) {
      setStatus({ tone: "error", message: problem });
      return;
    }
    if (!supabase) return;

    setIsSubmitting(true);
    setStatus(null);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      setStatus({ tone: "error", message: error.message });
      return;
    }
    setPassword("");
    setConfirmation("");
    setStatus({ tone: "ok", message: "Password updated. You can now sign in without a magic link." });
  };

  return (
    <section className="panel">
      <PanelHeader title="Password" icon={KeyRound} />
      <p>
        Set a password so you are never dependent on an emailed link to get back in.
      </p>
      <form className="password-form" onSubmit={submit}>
        <label>
          New password
          <input
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        <label>
          Confirm
          <input
            autoComplete="new-password"
            onChange={(event) => setConfirmation(event.target.value)}
            type="password"
            value={confirmation}
          />
        </label>
        {status && <p className={`form-note ${status.tone}`}>{status.message}</p>}
        <button className="secondary-action" disabled={isSubmitting} type="submit">
          <KeyRound size={16} />
          {isSubmitting ? "Saving…" : "Set password"}
        </button>
      </form>
    </section>
  );
}

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
      {mode === "supabase" && <PasswordPanel />}
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
