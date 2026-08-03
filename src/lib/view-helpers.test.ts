import { describe, it, expect } from "vitest";
import { navGroups, navItems } from "./view-helpers";

describe("navGroups", () => {
  // Expected values are transcribed from PRD §7.0's sidebar listing, not derived
  // from the implementation.
  it("groups the nav under Now, Work and Review in PRD order", () => {
    expect(navGroups.map((group) => group.label)).toEqual(["Now", "Work", "Review"]);
  });

  it("places each view in the group PRD §7.0 assigns it", () => {
    const byLabel = Object.fromEntries(
      navGroups.map((group) => [group.label, group.items.map((item) => item.key)]),
    );

    expect(byLabel.Now).toEqual(["command", "daily", "weekly"]);
    // Brain Dump and Resources are one entry — PRD §7.9.
    expect(byLabel.Work).toEqual(["board", "projects", "inbox", "brain"]);
    expect(byLabel.Review).toEqual(["reports", "archive", "settings"]);
  });

  it("keeps navItems as the flattened equivalent, so bottom nav stays in sync", () => {
    expect(navItems.map((item) => item.key)).toEqual(
      navGroups.flatMap((group) => group.items.map((item) => item.key)),
    );
  });

  it("lists every view exactly once", () => {
    const keys = navGroups.flatMap((group) => group.items.map((item) => item.key));
    expect(keys.length).toBe(new Set(keys).size);
  });
});
