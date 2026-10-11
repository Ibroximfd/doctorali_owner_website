import { describe, expect, it } from "vitest";

import { camelize } from "./camelize";

describe("camelize", () => {
  it("converts nested keys and arrays, leaving values untouched", () => {
    const result = camelize({
      delta_pct: 13.3,
      pipeline_now: [{ stale_count: 7, status: "pending_review" }],
      cash_position: { open_debt: null },
    });

    expect(result).toEqual({
      deltaPct: 13.3,
      pipelineNow: [{ staleCount: 7, status: "pending_review" }],
      cashPosition: { openDebt: null },
    });
  });

  it("keeps keys that are already camelCase or numeric", () => {
    expect(camelize({ generatedAt: "x", 5: 854 })).toEqual({ generatedAt: "x", 5: 854 });
  });

  it("passes primitives and null through", () => {
    expect(camelize(null)).toBeNull();
    expect(camelize("a_b")).toBe("a_b");
  });
});
