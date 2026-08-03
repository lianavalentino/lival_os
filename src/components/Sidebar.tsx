import { Brain, Clock3, Link2, Plus, SquareCheck } from "lucide-react";
import type { CaptureDraft, ViewKey } from "../types";
import { minutesToHours } from "../lib/metrics";
import { navGroups } from "../lib/view-helpers";

const captureShortcuts: Array<{
  label: string;
  type: CaptureDraft["type"];
  icon: typeof Plus;
}> = [
  { label: "Add Task", type: "task", icon: SquareCheck },
  { label: "Brain Dump", type: "brain", icon: Brain },
  { label: "Add Resource", type: "resource", icon: Link2 },
];

export function Sidebar({
  activeView,
  mobileNavOpen,
  weeklyMinutes,
  weeklyDays,
  onSelect,
  onCloseMobileNav,
  onOpenCapture,
}: {
  activeView: ViewKey;
  mobileNavOpen: boolean;
  weeklyMinutes: number;
  weeklyDays: Array<{ label: string; minutes: number }>;
  onSelect: (view: ViewKey) => void;
  onCloseMobileNav: () => void;
  onOpenCapture: (type?: CaptureDraft["type"]) => void;
}) {
  const peak = Math.max(...weeklyDays.map((day) => day.minutes), 1);

  return (
    <>
      <aside className={`sidebar ${mobileNavOpen ? "is-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">LV</div>
          <div>
            <strong>LIVAL OS</strong>
            <span>Personal command system</span>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="nav-groups">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={`nav-item ${activeView === item.key ? "active" : ""}`}
                    key={item.key}
                    onClick={() => onSelect(item.key)}
                    type="button"
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="nav-group sidebar-capture">
          <p className="nav-group-label">Quick Capture</p>
          {captureShortcuts.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <button
                className="capture-shortcut"
                key={shortcut.type}
                onClick={() => onOpenCapture(shortcut.type)}
                type="button"
              >
                <Icon size={16} aria-hidden="true" />
                <span>{shortcut.label}</span>
              </button>
            );
          })}
        </div>

        <div className="sidebar-card">
          <div className="mini-card-heading">
            <Clock3 size={16} />
            <span>This Week&apos;s Time</span>
          </div>
          <strong>{minutesToHours(weeklyMinutes)}</strong>
          <div className="week-bars">
            {weeklyDays.map((day, index) => (
              <div className="week-bar" key={`${day.label}-${index}`}>
                <div className="week-bar-track">
                  <div
                    className="week-bar-fill"
                    style={{ height: `${Math.round((day.minutes / peak) * 100)}%` }}
                  />
                </div>
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {mobileNavOpen && (
        <button
          aria-label="Close navigation"
          className="mobile-scrim"
          onClick={onCloseMobileNav}
          type="button"
        />
      )}
    </>
  );
}
