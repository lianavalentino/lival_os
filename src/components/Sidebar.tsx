import { Clock3, Plus } from "lucide-react";
import type { ViewKey } from "../types";
import { minutesToHours } from "../lib/metrics";
import { navItems } from "../lib/view-helpers";

export function Sidebar({
  activeView,
  mobileNavOpen,
  totalMinutes,
  activeProjectsCount,
  onSelect,
  onCloseMobileNav,
  onOpenCapture,
}: {
  activeView: ViewKey;
  mobileNavOpen: boolean;
  totalMinutes: number;
  activeProjectsCount: number;
  onSelect: (view: ViewKey) => void;
  onCloseMobileNav: () => void;
  onOpenCapture: () => void;
}) {
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

        <nav aria-label="Primary navigation" className="nav-list">
          {navItems.map((item) => {
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
        </nav>

        <div className="sidebar-card">
          <div className="mini-card-heading">
            <Clock3 size={16} />
            <span>Weekly Time</span>
          </div>
          <strong>{minutesToHours(totalMinutes)}</strong>
          <span>{activeProjectsCount} active projects</span>
        </div>

        <button className="primary-action" onClick={onOpenCapture} type="button">
          <Plus size={18} />
          Quick Capture
        </button>
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
