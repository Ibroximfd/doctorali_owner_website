import { describe, expect, it } from "vitest";

import { parseEnvelope } from "@/shared/lib/envelope";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import { operatorsOf, rankProducts, versusAverage } from "./analytics.rules";
import { analyticsSchema } from "./analytics.schema";

const analytics = (query: Record<string, string>) =>
  parseEnvelope(analyticsSchema, mockGet("analytics/v2/", query)).data;

describe("analytics contract", () => {
  it.each(SCOPE_CASES)("matches its schema for %o", (query) => {
    expect(() => analytics(query)).not.toThrow();
  });

  it("app and operator orders add up exactly to all orders, money included", () => {
    const all = analytics({ period: "30d" }).totals;
    const app = analytics({ period: "30d", source: "app" }).totals;
    const operator = analytics({ period: "30d", source: "operator" }).totals;
    for (const key of ["sold", "delivered", "cancelled"] as const)
      expect(app[key] + operator[key]).toBe(all[key]);
    expect(app.conversionPct).toBeNull();
    expect(analytics({ period: "30d", source: "app" }).operators).toEqual([]);
  });

  it("operators add up to their filial, filials add up to the total, products to the total", () => {
    const data = analytics({ period: "30d", source: "operator" });
    for (const filial of data.filials) {
      const own = data.operators.filter((row) => row.filialId === filial.id);
      expect(own.reduce((sum, row) => sum + row.sold, 0)).toBe(filial.sold);
      expect(own.reduce((sum, row) => sum + row.leads, 0)).toBe(filial.leads);
    }
    expect(data.filials.reduce((sum, row) => sum + row.sold, 0)).toBe(data.totals.sold);
    expect(data.products.reduce((sum, row) => sum + row.sold, 0)).toBe(data.totals.sold);
    expect(data.products.reduce((sum, row) => sum + row.cancelled, 0)).toBe(data.totals.cancelled);
  });
});

describe("analytics rules", () => {
  it("lists a filial's operators best conversion first", () => {
    const rows = operatorsOf(analytics({ period: "30d" }).operators, 3);
    expect(rows.map((row) => row.fullName)).toEqual([
      "Sevara Abdullayeva",
      "Ulug'bek Tursunov",
      "Feruza Olimova",
    ]);
  });

  it("compares with the filial average in points and flags the most cancelled product", () => {
    expect(versusAverage(35.5, 33)).toBe(2.5);
    expect(versusAverage(null, 33)).toBeNull();
    expect(rankProducts(analytics({ period: "30d" }).products).worstId).toBe(16);
  });
});

describe("analytics v2 answer (B-19)", () => {
  it("reads the daily trend with otkaz and the operator leads and conversion", () => {
    const data = analyticsSchema.parse({
      trend: { labels: ["2026-10-30", "2026-10-31"], sold: [3, "4"], delivered: [2, 3], otkaz: [0, 1] },
      operators: [
        {
          id: 25,
          full_name: "A",
          filial: { id: 1, name: "T" },
          leads: 40,
          sold: 10,
          otkaz: 1,
          conversion_pct: 25,
        },
        {
          id: 26,
          full_name: "B",
          filial: { id: 1, name: "T" },
          leads: 0,
          sold: 2,
          otkaz: 0,
          conversion_pct: null,
        },
      ],
    });
    expect(data.trend).toEqual({
      labels: ["2026-10-30", "2026-10-31"],
      sold: [3, 4],
      delivered: [2, 3],
      cancelled: [0, 1],
    });
    expect(data.operators.map((row) => [row.leads, row.conversion_pct, row.filial_id])).toEqual([
      [40, 25, 1],
      [0, null, 1],
    ]);
  });

  it("gives an empty trend when the block is missing or null", () => {
    expect(analyticsSchema.parse({ trend: null }).trend).toEqual({
      labels: [],
      sold: [],
      delivered: [],
      cancelled: [],
    });
  });
});
