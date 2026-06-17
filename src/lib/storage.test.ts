import { describe, it, expect } from "vitest";
import { seedData } from "../data/seed";
import { normalizeAppData } from "./storage";
import type { AppData } from "../types";

describe("normalizeAppData", () => {
  it("fills missing planning arrays with empty arrays", () => {
    const legacy = { ...seedData } as Partial<AppData>;
    delete legacy.taskUpdates;
    delete legacy.dailyPlans;
    delete legacy.weeklyPlans;

    const result = normalizeAppData(legacy as AppData);

    expect(result.taskUpdates).toEqual([]);
    expect(result.dailyPlans).toEqual([]);
    expect(result.weeklyPlans).toEqual([]);
    expect(result.areas).toBe(seedData.areas);
  });
});
