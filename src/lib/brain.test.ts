import { describe, it, expect } from "vitest";
import { BRAIN_TABS, brainTabItems } from "./brain";
import type { BrainDump, ResourceItem } from "../types";

const dump = (id: string, category: BrainDump["category"]): BrainDump => ({
  id,
  title: `dump ${id}`,
  body: "",
  category,
  status: "captured",
  source: "manual",
});

const resource = (id: string): ResourceItem => ({
  id,
  title: `resource ${id}`,
  url: "https://example.com",
  description: "",
  category: "Other",
  tags: [],
  source: "manual",
});

const data = {
  brainDumps: [dump("d1", "idea"), dump("d2", "someday"), dump("d3", "thought")],
  resources: [resource("r1"), resource("r2")],
};

describe("brainTabItems", () => {
  // Tab set and routing come from PRD §7.9: "Saved reads resources, everything
  // else reads brain_dumps."
  it("offers exactly the four PRD tabs", () => {
    expect(BRAIN_TABS).toEqual(["All", "Ideas", "Someday", "Saved"]);
  });

  it("reads resources for Saved", () => {
    const items = brainTabItems(data, "Saved");
    expect(items.map((item) => item.id)).toEqual(["r1", "r2"]);
  });

  it("reads brain dumps for All", () => {
    const items = brainTabItems(data, "All");
    expect(items.map((item) => item.id)).toEqual(["d1", "d2", "d3"]);
  });

  it("filters brain dumps by category for Ideas and Someday", () => {
    expect(brainTabItems(data, "Ideas").map((i) => i.id)).toEqual(["d1"]);
    expect(brainTabItems(data, "Someday").map((i) => i.id)).toEqual(["d2"]);
  });

  it("marks Saved items as links so the view can render a URL", () => {
    expect(brainTabItems(data, "Saved")[0].url).toBe("https://example.com");
    expect(brainTabItems(data, "Ideas")[0].url).toBeUndefined();
  });
});
