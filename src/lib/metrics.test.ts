import { describe, it, expect } from "vitest";
import { dashboardMetrics, projectTime, weeklyTime } from "./metrics";
import type { AppData, TimeEntry } from "../types";

const entry = (
  startedAt: string,
  durationMinutes: number,
  overrides: Partial<TimeEntry> = {},
): TimeEntry => ({
  id: `t-${startedAt}-${durationMinutes}`,
  areaId: "a1",
  workspaceId: "w1",
  startedAt,
  durationMinutes,
  description: "work",
  source: "claude_code",
  unreliable: false,
  ...overrides,
});

// Reference week: Mon 2026-07-27 .. Sun 2026-08-02.
const wednesday = new Date("2026-07-29T12:00:00");

describe("weeklyTime", () => {
  it("buckets the week's minutes by weekday, Monday first", () => {
    const result = weeklyTime(
      [
        entry("2026-07-27T09:00:00", 60), // Mon
        entry("2026-07-29T09:00:00", 30), // Wed
        entry("2026-07-29T14:00:00", 45), // Wed again
        entry("2026-08-02T10:00:00", 15), // Sun
      ],
      wednesday,
    );

    expect(result.days.map((d) => d.minutes)).toEqual([60, 0, 75, 0, 0, 0, 15]);
    expect(result.days.map((d) => d.label)).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
  });

  it("totals only the current week, ignoring entries outside it", () => {
    const result = weeklyTime(
      [
        entry("2026-07-26T09:00:00", 600), // Sun before — previous week
        entry("2026-07-28T09:00:00", 90), // Tue — in week
        entry("2026-08-03T09:00:00", 600), // Mon after — next week
      ],
      wednesday,
    );

    expect(result.totalMinutes).toBe(90);
  });

  it("reports zero for a week with no entries", () => {
    const result = weeklyTime([], wednesday);

    expect(result.totalMinutes).toBe(0);
    expect(result.days.every((d) => d.minutes === 0)).toBe(true);
  });

  it("excludes unreliable entries by default (ADR-0003: pre-heartbeat wall-clock)", () => {
    const result = weeklyTime(
      [
        entry("2026-07-27T09:00:00", 60), // Mon, reliable
        entry("2026-07-27T10:00:00", 5904, { unreliable: true }), // Mon, the four-day fiction
      ],
      wednesday,
    );

    expect(result.totalMinutes).toBe(60);
    expect(result.days[0].minutes).toBe(60);
  });
});

describe("dashboardMetrics", () => {
  const baseData = {
    tasks: [],
    inboxItems: [],
    projects: [],
    brainDumps: [],
  } as unknown as AppData;

  it("excludes unreliable entries from the total", () => {
    const result = dashboardMetrics({
      ...baseData,
      timeEntries: [entry("2026-07-27T09:00:00", 30), entry("2026-07-27T10:00:00", 5904, { unreliable: true })],
    });

    expect(result.totalMinutes).toBe(30);
  });
});

describe("projectTime", () => {
  it("excludes unreliable entries from a project's total", () => {
    const result = projectTime(
      {
        timeEntries: [
          entry("2026-07-27T09:00:00", 30, { projectId: "p1" }),
          entry("2026-07-27T10:00:00", 5904, { projectId: "p1", unreliable: true }),
        ],
      } as AppData,
      "p1",
    );

    expect(result).toBe(30);
  });
});
