import { describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
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

  it("answers an unknown filial with the section's own 404 code", () => {
    const missing = resolveMock({
      method: "GET",
      path: "structure/filials/999/seats/",
      searchParams: new URLSearchParams(),
      now: TEST_NOW,
    });

    expect(missing).toMatchObject({ status: 404, json: { code: "filial_not_found" } });
  });

  it("has no two handlers claiming the same method and path", () => {
    const signatures = listMockHandlers().map((handler) => `${handler.method} ${handler.path}`);

    expect(new Set(signatures).size).toBe(signatures.length);
  });
});

describe("meta mock", () => {
  it("matches the meta contract", () => {
    const meta = parseJson(metaSchema, mockGet("meta/"));

    expect(meta.filials.map((filial) => filial.code)).toEqual(["Q", "T1", "T2"]);
    expect(meta.filials.filter((filial) => filial.isMain).map((filial) => filial.code)).toEqual(["Q"]);
    expect(meta.regions).toHaveLength(14);
  });
});
