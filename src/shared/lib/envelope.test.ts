import { describe, expect, it } from "vitest";
import { z } from "zod";

import { metricSchema, parseEnvelope, pointChange } from "./envelope";

const valid = {
  period: { from: "2026-09-03", to: "2026-10-02", granularity: "day", label: "30d" },
  compare: null,
  filials: [1, 2],
  generated_at: "2026-10-02T09:05:00Z",
  data: { total_orders: { value: 3860, previous: null, delta_pct: null } },
};

describe("parseEnvelope", () => {
  it("validates and camelizes the payload", () => {
    const envelope = parseEnvelope(z.object({ total_orders: metricSchema }), valid);

    expect(envelope.generatedAt).toBe("2026-10-02T09:05:00Z");
    expect(envelope.freshness).toEqual({});
    expect(envelope.data.totalOrders).toEqual({ value: 3860, previous: null, deltaPct: null });
  });

  it("fails loudly with the path when the contract is broken", () => {
    const broken = { ...valid, data: { total_orders: { value: "3860", previous: null, delta_pct: null } } };

    expect(() => parseEnvelope(z.object({ total_orders: metricSchema }), broken)).toThrowError(
      /total_orders/,
    );
  });

  it("rejects a response without the envelope", () => {
    expect(() => parseEnvelope(z.object({}), { data: {} })).toThrowError();
  });
});

describe("pointChange", () => {
  it("measures a rate's change in percentage points, not relative percent", () => {
    // 10% → 12%: nisbiy +20%, lekin foiz punktida +2
    expect(pointChange({ value: 12, previous: 10 })).toBe(2);
    expect(pointChange({ value: 31.4, previous: 33.2 })).toBe(-1.8);
    expect(pointChange({ value: 12, previous: null })).toBeNull();
  });
});
