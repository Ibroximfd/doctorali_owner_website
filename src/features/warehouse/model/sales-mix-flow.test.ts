import { describe, expect, it } from "vitest";

import { buildMixFlow, FLOW_BOX } from "./sales-mix-flow";
import type { SalesMix } from "./warehouse.schema";
import { runwayRows } from "./warehouse.rules";

const numbers = {
  fullRevenue: 0,
  discountRevenue: 0,
  discountAmount: 0,
  giftValue: 0,
  avgDiscountPct: null,
};

const mix = (full: number, discount: number, gift: number, reasons: SalesMix["reasons"]): SalesMix => ({
  totals: { ...numbers, fullUnits: full, discountUnits: discount, giftUnits: gift, giftCost: null },
  products: [],
  reasons,
});

describe("buildMixFlow", () => {
  it("splits the source into kinds proportionally and keeps everything inside the box", () => {
    const flow = buildMixFlow(
      mix(600, 300, 100, [
        { kind: "discount", reason: "operator_discount", units: 200, amount: 10 },
        { kind: "discount", reason: "loyalty_points", units: 100, amount: 5 },
        { kind: "gift", reason: "promo_2plus1", units: 100, amount: 7 },
      ]),
    );

    expect(flow.total).toBe(1000);
    expect(flow.kinds.map((node) => node.kind)).toEqual(["full", "discount", "gift"]);
    const [full, discount] = flow.kinds;
    expect(full && discount ? full.height / discount.height : 0).toBeCloseTo(2);
    expect(flow.reasons.map((node) => node.reason)).toEqual([
      "operator_discount",
      "loyalty_points",
      "promo_2plus1",
    ]);
    // 3 ta tur oqimi + 3 ta sabab oqimi
    expect(flow.links).toHaveLength(6);
    for (const node of [...flow.kinds, ...flow.reasons]) {
      expect(node.y).toBeGreaterThanOrEqual(FLOW_BOX.top);
      expect(node.y + node.height).toBeLessThanOrEqual(FLOW_BOX.height + 0.001);
    }
  });

  it("skips empty kinds and squeezes reasons that exceed their kind", () => {
    const flow = buildMixFlow(mix(500, 0, 50, [{ kind: "gift", reason: "sample", units: 200, amount: 1 }]));

    expect(flow.kinds.map((node) => node.kind)).toEqual(["full", "gift"]);
    const gift = flow.kinds.find((node) => node.kind === "gift");
    expect(flow.reasons[0]?.height).toBeCloseTo(gift?.height ?? 0);
  });

  it("keeps labels apart even for tiny flows", () => {
    const flow = buildMixFlow(
      mix(1000, 10, 10, [
        { kind: "discount", reason: "bulk", units: 10, amount: 1 },
        { kind: "gift", reason: "sample", units: 10, amount: 1 },
      ]),
    );
    const [first, second] = flow.reasons;
    expect((second?.labelY ?? 0) - (first?.labelY ?? 0)).toBeGreaterThanOrEqual(40);
  });
});

describe("runwayRows", () => {
  it("keeps measurable rows, soonest stockout first", () => {
    const rows = runwayRows([
      { id: "a", status: "ok", daysOfCover: 20 },
      { id: "b", status: "empty", daysOfCover: null },
      { id: "c", status: "out", daysOfCover: null },
      { id: "d", status: "critical", daysOfCover: 2.5 },
    ]);
    expect(rows.map((row) => row.id)).toEqual(["c", "d", "a"]);
  });
});
