import type { BrainDump, ResourceItem } from "../types";

/**
 * Brain merges the former Brain Dump and Resources views (PRD §7.9). The two
 * tables stay separate underneath — a brain dump succeeds when it converts to a
 * task and disappears, a resource succeeds when it is still findable in six
 * months. One shared status column serving both produces a junk drawer.
 */
export const BRAIN_TABS = ["All", "Ideas", "Someday", "Saved"] as const;

export type BrainTab = (typeof BRAIN_TABS)[number];

export type BrainRow = {
  id: string;
  title: string;
  body: string;
  /** Present only for Saved (resources); the view renders it as a link. */
  url?: string;
};

const fromDump = (item: BrainDump): BrainRow => ({
  id: item.id,
  title: item.title,
  body: item.body,
});

const fromResource = (item: ResourceItem): BrainRow => ({
  id: item.id,
  title: item.title,
  body: item.description,
  url: item.url,
});

export function brainTabItems(
  data: { brainDumps: BrainDump[]; resources: ResourceItem[] },
  tab: BrainTab,
): BrainRow[] {
  if (tab === "Saved") return data.resources.map(fromResource);
  if (tab === "All") return data.brainDumps.map(fromDump);

  const category = tab === "Ideas" ? "idea" : "someday";
  return data.brainDumps.filter((item) => item.category === category).map(fromDump);
}
