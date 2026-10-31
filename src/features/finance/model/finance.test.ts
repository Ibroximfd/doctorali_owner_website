import { describe, expect, it } from "vitest";

import { parseEnvelope } from "@/shared/lib/envelope";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import { chiefRows, feeDue, lastHandovers, regionSteps } from "./finance.rules";
import { financeSchema } from "./finance.schema";

const finance = (query: Record<string, string>) =>
  parseEnvelope(financeSchema, mockGet("finance/v2/", query)).data;

describe("finance contract", () => {
  it.each(SCOPE_CASES)("matches its schema for %o", (query) => {
    expect(() => finance(query)).not.toThrow();
  });

  it("totals are the sum of filials; money in the chain adds up to the revenue", () => {
    const data = finance({ period: "30d" });
    const sum = (key: "revenue" | "atCouriers" | "atChiefs" | "handed" | "addresses") =>
      data.filials.reduce((total, row) => total + row[key], 0);
    expect(sum("revenue")).toBe(data.totals.revenue);
    expect(sum("addresses")).toBe(data.totals.addresses);
    expect(data.totals.atCouriers + data.totals.atChiefs + data.totals.handed).toBe(data.totals.revenue);
  });

  it("pays every chief courier one common rate per delivered address, per filial", () => {
    const data = finance({ period: "30d" });
    expect(data.addressRate).toBe(25_000);
    for (const row of chiefRows(data.chiefs)) expect(row.fee).toBe(row.addresses * data.addressRate);
    expect(data.chiefs).toHaveLength(5);
  });

  it("has all fourteen regions for the map", () => {
    expect(finance({ period: "30d" }).regions).toHaveLength(14);
  });
});

describe("finance rules", () => {
  it("computes the fee still owed", () => {
    expect(feeDue({ chiefFee: 100, chiefFeePaid: 80 })).toBe(20);
    expect(feeDue({ chiefFee: 100, chiefFeePaid: 120 })).toBe(0);
  });

  it("steps region money on a six-step scale and leaves empty regions blank", () => {
    const steps = regionSteps([
      { code: "a", sold: 0, delivered: 0, cancelled: 0, money: 0 },
      { code: "b", sold: 1, delivered: 1, cancelled: 0, money: 100 },
      { code: "c", sold: 1, delivered: 1, cancelled: 0, money: 10 },
    ]);
    expect(steps.get("a")).toBeNull();
    expect(steps.get("b")).toBe(5);
    expect(steps.get("c")).toBe(0);
  });

  it("keeps the last handover of each chief courier and filial, late ones first", () => {
    const rows = lastHandovers(finance({ period: "30d" }).handovers);
    expect(rows).toHaveLength(15);
    expect(rows[0]).toMatchObject({ chiefName: "Farhod Normatov", filialCode: "T2", onTime: false });
  });

  it("flags a chief courier who holds back a large share of a filial's money", () => {
    const data = finance({ period: "30d" });
    const late = chiefRows(data.chiefs).filter((row) => row.pendingPct > 20);
    expect(late.map((row) => `${row.skladName}-${row.filialCode}`)).toEqual(["Janub-T2"]);
  });
});
