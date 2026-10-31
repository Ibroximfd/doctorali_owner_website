import { describe, expect, it } from "vitest";

import { camelize } from "@/shared/lib/camelize";
import { parseEnvelope } from "@/shared/lib/envelope";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import { moneyTotal, rankFilials, weakestFilialId } from "./overview.rules";
import { overviewSchema } from "./overview.schema";

const overview = (query: Record<string, string>) =>
  parseEnvelope(overviewSchema, mockGet("overview/v2/", query)).data;

describe("overview contract", () => {
  it.each(SCOPE_CASES)("matches its schema for %o", (query) => {
    expect(() => overview(query)).not.toThrow();
  });

  it("money in the chain adds up to the revenue, orders split into the four states", () => {
    const data = overview({ period: "30d" });
    expect(moneyTotal(data.money)).toBe(data.revenue.value);
    const { sold, inTransit, delivered, cancelled } = data.orders;
    // sotilgandan qolgani — tasdiqlangan, hali yo'lga chiqmagan (ilova zakazlari)
    expect((inTransit.value ?? 0) + (delivered.value ?? 0) + (cancelled.value ?? 0)).toBeLessThanOrEqual(
      sold.value ?? 0,
    );
    expect(data.filials.reduce((sum, row) => sum + row.sold, 0)).toBe(sold.value);
  });

  it("follows the filial filter", () => {
    expect(overview({ period: "30d", filial: "3" }).filials.map((row) => row.code)).toEqual(["T2"]);
  });
});

describe("overview rules", () => {
  it("ranks filials by revenue with their share", () => {
    const ranked = rankFilials([
      { id: 1, revenue: 30 },
      { id: 2, revenue: 70 },
    ]);
    expect(ranked.map((row) => [row.id, row.sharePct])).toEqual([
      [2, 70],
      [1, 30],
    ]);
  });

  it("marks the weakest conversion only when there is something to compare", () => {
    expect(
      weakestFilialId([
        { id: 1, conversionPct: 33 },
        { id: 3, conversionPct: 27 },
      ]),
    ).toBe(3);
    expect(weakestFilialId([{ id: 1, conversionPct: 33 }])).toBeNull();
  });
});

describe("overview v2 comparison (B-17)", () => {
  const live = {
    money_chain: { with_couriers: "10", with_chiefs: "0", handed_to_filials: "5" },
    orders: { lead: 10224, sold: 416, in_transit: 6, delivered: 374, otkaz: 6 },
    revenue: "82589749",
    conversion_pct: 0.1,
    previous: {
      lead: 16,
      sold: 76,
      in_transit: 0,
      delivered: 36,
      otkaz: 0,
      revenue: "9519680",
      conversion_pct: 12.5,
    },
    delta_pct: {
      lead: 63800.0,
      sold: 447.4,
      in_transit: null,
      delivered: 941.7,
      otkaz: null,
      revenue: 767.6,
      conversion_pct: -99.2,
    },
  };

  it("compares revenue, every order count and conversion from the per-metric objects", () => {
    const data = camelize(overviewSchema.parse(live));
    expect(data.revenue).toMatchObject({ value: 82_589_749, previous: 9_519_680, deltaPct: 767.6 });
    expect(data.orders.leads).toMatchObject({ value: 10_224, previous: 16, deltaPct: 63_800 });
    expect(data.orders.sold).toMatchObject({ value: 416, previous: 76, deltaPct: 447.4 });
    expect(data.orders.delivered.deltaPct).toBe(941.7);
    // server bergan qiymat o'zgartirilmaydi — foiz punktga aylantirilmaydi
    expect(data.conversion).toMatchObject({ value: 0.1, previous: 12.5, deltaPct: -99.2 });
    expect(data.cancelRate.value).toBe(1.4);
  });

  it("draws no change where delta_pct is null", () => {
    const data = camelize(overviewSchema.parse(live));
    expect(data.orders.inTransit).toMatchObject({ value: 6, previous: 0, deltaPct: null });
    expect(data.orders.cancelled).toMatchObject({ value: 6, previous: 0, deltaPct: null });
  });

  it("has no comparison without previous / delta_pct; revenue falls back to the filials' sum", () => {
    const data = camelize(
      overviewSchema.parse({
        orders: { sold: 2 },
        filials: [
          { id: 1, name: "A", revenue: "40" },
          { id: 2, name: "B", revenue: 2 },
        ],
      }),
    );
    expect(data.revenue).toMatchObject({ value: 42, previous: null, deltaPct: null });
    expect(data.orders.sold).toMatchObject({ value: 2, previous: null, deltaPct: null });
    expect(data.conversion).toMatchObject({ value: null, deltaPct: null });
  });
});
