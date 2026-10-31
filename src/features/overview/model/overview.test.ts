import { describe, expect, it } from "vitest";

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
