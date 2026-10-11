import { describe, expect, it } from "vitest";

import { metaSchema } from "@/shared/meta/meta.schema";
import { TEST_NOW, mockGet } from "@/shared/testing/mock-api";

import { listMockHandlers, resolveMock } from "./registry";

describe("resolveMock", () => {
  it("answers 404 with a code for an unknown path", () => {
    const response = resolveMock({
      method: "GET",
      path: "nope/",
      searchParams: new URLSearchParams(),
      now: TEST_NOW,
    });

    expect(response.status).toBe(404);
    expect(response.json).toMatchObject({ code: "not_found" });
  });

  it("does not match a different method on the same path", () => {
    expect(
      resolveMock({ method: "DELETE", path: "meta/", searchParams: new URLSearchParams(), now: TEST_NOW })
        .status,
    ).toBe(404);
  });

  it("prefers a static path over a parametrised one, whatever the registration order", () => {
    // `orders/:id/` va `orders/summary/` ikkalasi ham mos keladi — aniq yo'l yutishi kerak.
    const summary = resolveMock({
      method: "GET",
      path: "orders/summary/",
      searchParams: new URLSearchParams(),
      now: TEST_NOW,
    });

    expect(summary.status).toBe(200);
    expect(summary.json).toHaveProperty("data");
  });

  it("answers an unknown order id with the order's own 404 code", () => {
    const missing = resolveMock({
      method: "GET",
      path: "orders/no-such-order/",
      searchParams: new URLSearchParams(),
      now: TEST_NOW,
    });

    expect(missing).toMatchObject({ status: 404, json: { code: "order_not_found" } });
  });

  it("has no two handlers claiming the same method and path", () => {
    const signatures = listMockHandlers().map((handler) => `${handler.method} ${handler.path}`);

    expect(new Set(signatures).size).toBe(signatures.length);
  });
});

describe("meta mock", () => {
  it("matches the meta contract", () => {
    const meta = metaSchema.parse(mockGet("meta/"));

    expect(meta.filials.map((filial) => filial.name)).toEqual(["Toshkent", "Qo'qon", "Samarqand"]);
    expect(meta.regions).toHaveLength(14);
  });
});
