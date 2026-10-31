import { describe, expect, it } from "vitest";

import { parseFlexible } from "@/shared/lib/lenient";
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
import { salesOperatorsSchema, toLeaderboard, toProfile, toTeams } from "./sales-operators";

const operators = (query: Record<string, string>) =>
  parseFlexible(salesOperatorsSchema, mockGet("sales/operators/", query)).data;

describe("staff contract (sales/operators, B-15)", () => {
  it.each(SCOPE_CASES)("sales/operators matches its schema for %o", (query) => {
    expect(() => operators(query)).not.toThrow();
  });

  it("ranks by sales; the best seller scores 100 and metrics read by the snake_case key", () => {
    const board = toLeaderboard(operators({ period: "30d" }), null);
    const [first, second] = board.rows;
    expect(first?.score).toBe(100);
    expect(Number(first && metricValue(first.metrics, "sales_amount"))).toBeGreaterThanOrEqual(
      Number(second && metricValue(second.metrics, "sales_amount")),
    );
    expect(toProfile(operators({ period: "30d" }), -1)).toBeNull();
  });
});

describe("staff and filials", () => {
  it("teams are the filials, and operators add up to the same totals as analytics", () => {
    const rows = operators({ period: "30d" });
    expect(toTeams(rows).map((team) => team.name)).toEqual(["Qo'qon", "Toshkent 1", "Toshkent 2"]);
    const board = toLeaderboard(rows, 1);
    expect(board.rows.reduce((sum, row) => sum + Number(metricValue(row.metrics, "leads")), 0)).toBe(5200);
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
    expect(
      leadColumn([
        { key: "conversion_pct", unit: "pct", better: "higher" as const },
        { key: "sales_amount", unit: "uzs", better: "higher" as const },
      ])?.key,
    ).toBe("sales_amount");
  });

  it("tones a value against the column average", () => {
    expect(relativeTone(6, 12, "lower")).toBe("good");
    expect(relativeTone(12, 12, "lower")).toBe("neutral");
    expect(relativeTone(31, 12, "lower")).toBe("crit");
    expect(relativeTone(null, 12, "lower")).toBe("neutral");
    expect(relativeTone(60, 40, "higher")).toBe("good");
  });

  it("flags lagging rows by score or by the backend badge", () => {
    expect(isLagging({ badges: [] })).toBe(false);
    expect(isLagging({ badges: ["needs_attention"] })).toBe(true);
    expect(isLagging({ badges: [] })).toBe(false);
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
    // yetakchining qiymati 0 — «0,0 marta yuqori» jumlasi chiqmaydi
    expect(leaderInsight([row("A", 1, 90, 0), row("B", 2, 70, 40)], "conversion_pct")).toBeNull();
  });
});

describe("sales/operators v2 rows (B-22 / N-9)", () => {
  it("reads filial as an object, keeps the old name string, and leaves conversion empty without leads", () => {
    const rows = salesOperatorsSchema.parse([
      {
        id: 1,
        full_name: "A",
        filial: { id: 3, name: "Mehrigiyo Toshkent 2" },
        filial_name: "x",
        leads: 0,
        conversion_pct: null,
      },
      { id: 2, full_name: "B", filial: null, filial_name: "Mehrigiyo Qo'qon", leads: 10, conversion_pct: 20 },
      { id: 3, full_name: "C", filial: "Mehrigiyo Toshkent", leads: 5, conversion_pct: "40.0" },
    ]);
    expect(rows.map((row) => [row.filial, row.filial_id, row.conversion_pct])).toEqual([
      ["Mehrigiyo Toshkent 2", 3, null],
      ["Mehrigiyo Qo'qon", null, 20],
      ["Mehrigiyo Toshkent", null, 40],
    ]);
  });
});
