import { describe, expect, it } from "vitest";

import { parseEnvelope, timeseriesSchema } from "@/shared/lib/envelope";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import { coverPercent, isProblemStock, isStockStatus, stockRank } from "./warehouse.rules";
import { salesMixSchema, stockSchema, warehouseSummarySchema, warehousesSchema } from "./warehouse.schema";

type Query = Record<string, string>;

const summaryFor = (query: Query) =>
  parseEnvelope(warehouseSummarySchema, mockGet("warehouse/summary/", query)).data;
const warehousesFor = (query: Query) =>
  parseEnvelope(warehousesSchema, mockGet("warehouse/warehouses/", query)).data;
const stockFor = (query: Query) => parseEnvelope(stockSchema, mockGet("warehouse/stock/", query)).data;

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

describe("warehouse contract", () => {
  it.each(SCOPE_CASES)("every sample response matches its schema for %o", (query) => {
    expect(() => {
      summaryFor(query);
      warehousesFor(query);
      stockFor(query);
      parseEnvelope(timeseriesSchema, mockGet("warehouse/movements/", query));
    }).not.toThrow();
  });

  it.each(SCOPE_CASES)("warehouse rows add up to the summary for %o", (query) => {
    const summary = summaryFor(query);
    const warehouses = warehousesFor(query);
    expect(sum(warehouses.map((row) => row.stockUnits))).toBe(summary.stockUnits);
    expect(sum(warehouses.map((row) => row.stockValue))).toBe(summary.stockValue);
    expect(sum(stockFor(query).map((row) => row.qty))).toBe(summary.stockUnits);
  });

  it("puts the riskiest stock first and filters by warehouse", () => {
    const rows = stockFor({ period: "30d" });
    const ranks = rows.map((row) => stockRank(row.status));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(stockFor({ period: "30d", warehouse: "2" }).every((row) => row.warehouseId === 2)).toBe(true);
  });

  it("shows the marketplace warehouse only when all filials are selected", () => {
    expect(warehousesFor({ period: "30d" }).some((row) => row.source === "marketplace")).toBe(true);
    expect(warehousesFor({ period: "30d", filial: "1" }).map((row) => row.id)).toEqual([1]);
  });
});

describe("warehouse sales mix", () => {
  it.each(SCOPE_CASES)("products and reasons add up to the totals for %o", (query) => {
    const mix = parseEnvelope(salesMixSchema, mockGet("warehouse/sales-mix/", query)).data;
    expect(sum(mix.products.map((row) => row.fullUnits))).toBe(mix.totals.fullUnits);
    expect(sum(mix.products.map((row) => row.giftUnits))).toBe(mix.totals.giftUnits);
    expect(sum(mix.reasons.map((row) => row.units))).toBe(mix.totals.discountUnits + mix.totals.giftUnits);
  });
});

describe("warehouse rules", () => {
  it("recognises statuses and problem stock", () => {
    expect(isStockStatus("critical")).toBe(true);
    expect(isStockStatus("weird")).toBe(false);
    expect(isProblemStock("out")).toBe(true);
    expect(isProblemStock("low")).toBe(false);
    expect(stockRank("weird")).toBeGreaterThan(stockRank("ok"));
  });

  it("maps days of cover to a 0–100 bar", () => {
    expect(coverPercent(null)).toBe(0);
    expect(coverPercent(15)).toBe(50);
    expect(coverPercent(90)).toBe(100);
  });
});
