import { describe, expect, it } from "vitest";

import { parseEnvelope } from "@/shared/lib/envelope";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import { byDebtDesc, isAgingKey, isSettlementStatus, paidPercent } from "./settlements.rules";
import {
  agingSchema,
  b2bSchema,
  regionSettlementsSchema,
  settlementsSummarySchema,
} from "./settlements.schema";

type Query = Record<string, string>;

const summaryFor = (query: Query) =>
  parseEnvelope(settlementsSummarySchema, mockGet("settlements/summary/", query)).data;
const regionsFor = (query: Query) =>
  parseEnvelope(regionSettlementsSchema, mockGet("settlements/regions/", query)).data;
const b2bFor = (query: Query) => parseEnvelope(b2bSchema, mockGet("settlements/b2b/", query)).data.results;
const agingFor = (query: Query) => parseEnvelope(agingSchema, mockGet("settlements/aging/", query)).data;

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

describe("settlements contract", () => {
  it.each(SCOPE_CASES)("every sample response matches its schema for %o", (query) => {
    expect(() => {
      summaryFor(query);
      regionsFor(query);
      b2bFor(query);
      agingFor(query);
    }).not.toThrow();
  });

  it.each(SCOPE_CASES)("region and pharmacy debts add up to the receivable for %o", (query) => {
    const summary = summaryFor(query);
    const debt = sum(regionsFor(query).map((row) => row.debt)) + sum(b2bFor(query).map((row) => row.debt));
    expect(debt).toBe(summary.receivable);
    expect(sum(agingFor(query).buckets.map((bucket) => bucket.amount))).toBe(summary.receivable);
  });

  it("keeps debt = net due − paid on every region", () => {
    for (const row of regionsFor({ period: "30d" })) {
      expect(row.debt).toBe(Math.max(0, row.netDue - row.paid));
      expect(isSettlementStatus(row.status)).toBe(true);
    }
  });
});

describe("settlements rules", () => {
  it("computes the paid share and orders debtors first", () => {
    expect(paidPercent(50, 100)).toBe(50);
    expect(paidPercent(0, 0)).toBe(100);
    expect(
      byDebtDesc([
        { debt: 1, netDue: 1 },
        { debt: 5, netDue: 1 },
      ])[0]?.debt,
    ).toBe(5);
    expect(isAgingKey("8_30")).toBe(true);
    expect(isAgingKey("x")).toBe(false);
  });
});
