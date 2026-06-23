import { Menu, Plus, Search } from "lucide-react";
import type { ViewKey } from "../types";
import { StatusPill } from "./ui/primitives";
import { viewTitle, viewSubtitle } from "../lib/view-helpers";

export function TopBar({
  activeView,
  repositoryMode,
  onOpenMobileNav,
  onOpenCapture,
}: {
  activeView: ViewKey;
  repositoryMode: "demo" | "supabase";
  onOpenMobileNav: () => void;
  onOpenCapture: () => void;
}) {
  return (
    <header className="topbar">
      <button
        className="icon-button mobile-only"
        onClick={onOpenMobileNav}
        type="button"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>
      <div>
        <h1>{viewTitle(activeView)}</h1>
        <p>{viewSubtitle(activeView)}</p>
      </div>
      <div className="topbar-actions">
        <StatusPill
          active={repositoryMode === "supabase"}
          label={repositoryMode === "supabase" ? "Supabase live" : "Demo mode"}
        />
        <div className="search-control">
          <Search size={16} />
          <span>Search anything</span>
        </div>
        <button className="primary-action compact" onClick={onOpenCapture} type="button">
          <Plus size={17} />
          Capture
        </button>
      </div>
    </header>
  );
}
