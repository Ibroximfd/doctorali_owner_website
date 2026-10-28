import { describe, expect, it } from "vitest";

import { parseEnvelope } from "@/shared/lib/envelope";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import {
  isLagging,
  leadColumn,
  leaderInsight,
  metricValue,
  relativeTone,
  sortByRank,
  versusTeam,
} from "./staff.rules";
import { leaderboardSchema, profileSchema, teamsSchema } from "./staff.schema";

describe("staff contract", () => {
  it.each(SCOPE_CASES)("leaderboard, teams and profile match their schemas for %o", (query) => {
    expect(() => {
      parseEnvelope(leaderboardSchema, mockGet("staff/leaderboard/", { ...query, role: "operator" }));
      parseEnvelope(leaderboardSchema, mockGet("staff/leaderboard/", { ...query, role: "courier" }));
      parseEnvelope(teamsSchema, mockGet("staff/teams/", { ...query, role: "operator" }));
      parseEnvelope(profileSchema, mockGet("staff/10/", query));
    }).not.toThrow();
  });

  it("reads metrics by the snake_case column key", () => {
    const board = parseEnvelope(
      leaderboardSchema,
      mockGet("staff/leaderboard/", { period: "30d", role: "operator" }),
    ).data;
    const first = board.rows[0];
    expect(first && metricValue(first.metrics, "conversion_pct")).toBeGreaterThan(0);
  });
});

describe("staff rules", () => {
  it("compares with the team in the right direction", () => {
    expect(versusTeam(12, 10, "higher")).toBe(20);
    expect(versusTeam(12, 10, "lower")).toBe(-20);
    expect(versusTeam(null, 10, "higher")).toBeNull();
  });

  it("keeps people without a score last", () => {
    const sorted = sortByRank([
      { rank: 1, score: null },
      { rank: 2, score: 50 },
    ]);
    expect(sorted[0]?.score).toBe(50);
  });
});

describe("staff board rules", () => {
  it("picks the first higher-is-better percent column as the lead bar", () => {
    expect(
      leadColumn([
        { key: "leads", unit: "count", better: "higher" as const },
        { key: "cancel_rate_pct", unit: "pct", better: "lower" as const },
        { key: "conversion_pct", unit: "pct", better: "higher" as const },
      ])?.key,
    ).toBe("conversion_pct");
    expect(leadColumn([{ key: "leads", unit: "count", better: "higher" as const }])).toBeNull();
  });

  it("tones a value against the column average", () => {
    expect(relativeTone(6, 12, "lower")).toBe("good");
    expect(relativeTone(12, 12, "lower")).toBe("neutral");
    expect(relativeTone(31, 12, "lower")).toBe("crit");
    expect(relativeTone(null, 12, "lower")).toBe("neutral");
    expect(relativeTone(60, 40, "higher")).toBe("good");
  });

  it("flags lagging rows by score or by the backend badge", () => {
    expect(isLagging({ score: 41, badges: [] })).toBe(true);
    expect(isLagging({ score: 90, badges: ["needs_attention"] })).toBe(true);
    expect(isLagging({ score: null, badges: [] })).toBe(false);
  });

  it("compares the leader with the team average", () => {
    const row = (fullName: string, rank: number, score: number | null, conversionPct: number | null) => ({
      fullName,
      rank,
      score,
      metrics: { conversionPct },
    });
    const insight = leaderInsight(
      [row("B", 2, 70, 30), row("A", 1, 90, 60), row("C", 3, null, 90)],
      "conversion_pct",
    );
    expect(insight?.leader.fullName).toBe("A");
    expect(insight?.ratio).toBe(1.3);
    expect(leaderInsight([row("A", 1, 90, 60)], "conversion_pct")).toBeNull();
  });
});
