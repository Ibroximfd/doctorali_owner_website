import { describe, expect, it } from "vitest";

import { parseFlexible } from "@/shared/lib/lenient";
import { mockGet } from "@/shared/testing/mock-api";

import {
  EMPTY_FILTERS,
  explainedMetrics,
  filterCouriers,
  hasFilters,
  metricTitle,
  sortByScore,
  starShare,
} from "./ratings.rules";
import {
  couriersDataSchema,
  logistsDataSchema,
  operatorsDataSchema,
  type CourierRow,
} from "./ratings.schema";

const rows = [
  { id: 1, score: null },
  { id: 2, score: 30 },
  { id: 3, score: 75 },
  { id: 4, score: null },
  { id: 5, score: 41 },
];

describe("sortByScore", () => {
  it("puts the best first by direction and keeps null scores at the end", () => {
    expect(sortByScore(rows, "desc").map((row) => row.id)).toEqual([3, 5, 2, 1, 4]);
    // logist: kam — yaxshi
    expect(sortByScore(rows, "asc").map((row) => row.id)).toEqual([2, 5, 3, 1, 4]);
  });
});

describe("schemas", () => {
  it("reads the contract sample of the couriers tab without turning nulls into zeros", () => {
    const parsed = parseFlexible(couriersDataSchema, {
      data: {
        tab: "couriers",
        formula: { score: { key: "score", name: "Kuryer reytingi", how: "Bayes", direction: "desc" } },
        summary: { avg: null, count: 0 },
        rows: [
          {
            courier: { id: 17, name: "Alisher Karimov", chief_id: 5, region: "fargona", is_active: true },
            score: null,
            rating_avg: null,
            ratings_count: 0,
            distribution: { "5": 2 },
            delivered_orders: 0,
            rated_share: null,
          },
        ],
      },
      period: { from: "2026-10-03", to: "2026-11-01", granularity: "day", label: "30d" },
      compare: null,
      filials: [],
      generated_at: "2026-11-01T10:00:00Z",
    }).data;
    expect(parsed.summary.avg).toBeNull();
    const row = parsed.rows[0];
    expect(row?.score).toBeNull();
    expect(row?.ratedShare).toBeNull();
    expect(row?.distribution).toEqual({ "5": 2, "4": 0, "3": 0, "2": 0, "1": 0 });
    expect(parsed.formula.metrics).toEqual([]);
  });

  it("reads money as a string and survives a missing formula", () => {
    const parsed = operatorsDataSchema.parse({
      rows: [{ operator: { id: 9, name: "Nodira" }, score: 75, revenue: "1500000" }],
    });
    expect(parsed.rows[0]?.revenue).toBe(1_500_000);
    expect(parsed.rows[0]?.orders_total).toBeNull();
    expect(parsed.formula.score).toBeNull();
  });

  it("accepts every demo sample", () => {
    expect(() =>
      couriersDataSchema.parse((mockGet("ratings/couriers/") as { data: unknown }).data),
    ).not.toThrow();
    expect(() =>
      operatorsDataSchema.parse((mockGet("ratings/operators/") as { data: unknown }).data),
    ).not.toThrow();
    const logists = logistsDataSchema.parse((mockGet("ratings/logists/") as { data: unknown }).data);
    expect(logists.formula.score?.direction).toBe("asc");
  });
});

describe("formula helpers", () => {
  const formula = {
    score: {
      key: "score",
      name: "Yetkazilish ulushi",
      how: "…",
      unit: "%",
      direction: "desc" as const,
      nullWhen: null,
      note: "Mijoz bahosi emas",
    },
    metrics: [
      {
        key: "revenue",
        name: "",
        how: null,
        unit: null,
        direction: "desc" as const,
        nullWhen: null,
        note: null,
      },
    ],
  };

  it("uses the server name as the column title, with a local fallback", () => {
    expect(metricTitle(formula, "score", "fallback")).toBe("Yetkazilish ulushi");
    expect(metricTitle(formula, "revenue", "Tushum")).toBe("Tushum");
    expect(metricTitle(formula, "unknown", "X")).toBe("X");
  });

  it("explains only metrics that carry an explanation", () => {
    expect(explainedMetrics(formula).map((metric) => metric.key)).toEqual(["score"]);
  });
});

describe("courier filters", () => {
  const courier = (
    id: number,
    region: string | null,
    isActive: boolean,
    score: number | null,
  ): CourierRow => ({
    courier: { id, name: `Kuryer ${id}`, chiefId: null, region, isActive },
    score,
    ratingAvg: score,
    ratingsCount: 1,
    distribution: {},
    deliveredOrders: 1,
    ratedShare: null,
  });
  const list = [
    courier(1, "fargona", true, 4.7),
    courier(2, "namangan", false, 3.2),
    courier(3, "fargona", true, null),
  ];

  it("filters by region, activity, rated and minimal score", () => {
    expect(hasFilters(EMPTY_FILTERS)).toBe(false);
    expect(
      filterCouriers(list, { ...EMPTY_FILTERS, region: "fargona" }).map((row) => row.courier.id),
    ).toEqual([1, 3]);
    expect(
      filterCouriers(list, { ...EMPTY_FILTERS, activity: "inactive" }).map((row) => row.courier.id),
    ).toEqual([2]);
    expect(filterCouriers(list, { ...EMPTY_FILTERS, rated: true }).map((row) => row.courier.id)).toEqual([
      1, 2,
    ]);
    expect(filterCouriers(list, { ...EMPTY_FILTERS, minScore: 4 }).map((row) => row.courier.id)).toEqual([1]);
    expect(filterCouriers(list, { ...EMPTY_FILTERS, q: "kuryer 2" }).map((row) => row.courier.id)).toEqual([
      2,
    ]);
  });
});

describe("starShare", () => {
  it("is null when nobody rated (not 0%)", () => {
    expect(starShare({ "5": 0, "4": 0 }, "5")).toBeNull();
    expect(starShare({ "5": 3, "4": 1 }, "5")).toBe(75);
  });
});
