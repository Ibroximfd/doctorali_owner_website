import { describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { mockGet } from "@/shared/testing/mock-api";

import { lagParts, sortComponents } from "./system.rules";
import { auditSchema, healthSchema, syncSchema } from "./system.schema";

describe("system contract", () => {
  it("every endpoint matches its schema", () => {
    expect(() => {
      parseJson(healthSchema, mockGet("system/health/"));
      parseJson(syncSchema, mockGet("system/sync/"));
      parseJson(auditSchema, mockGet("system/audit/", { page: "1" }));
    }).not.toThrow();
  });
});

describe("system rules", () => {
  it("puts broken components first", () => {
    expect(
      sortComponents([{ status: "ok" }, { status: "down" }, { status: "degraded" }]).map((row) => row.status),
    ).toEqual(["down", "degraded", "ok"]);
  });

  it("formats lag in readable units", () => {
    expect(lagParts(40)).toEqual({ value: 40, unit: "seconds" });
    expect(lagParts(540)).toEqual({ value: 9, unit: "minutes" });
    expect(lagParts(7200)).toEqual({ value: 2, unit: "hours" });
  });
});
