import type { ViewKey } from "../types";
import { bottomNav } from "../lib/view-helpers";

export function BottomNav({
  activeView,
  onSelect,
}: {
  activeView: ViewKey;
  onSelect: (view: ViewKey) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {bottomNav.map((item) => {
        const Icon = item.icon;
        return (
          <button
            className={activeView === item.key ? "active" : ""}
            key={item.key}
            onClick={() => onSelect(item.key)}
            type="button"
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
