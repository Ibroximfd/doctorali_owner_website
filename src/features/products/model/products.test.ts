import { describe, expect, it } from "vitest";

import { parseEnvelope } from "@/shared/lib/envelope";
import { sample } from "@/shared/testing/fixtures/sample";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import { rankProducts, shareOfMax, sortCategories, stockLevel } from "./products.rules";
import { productsSchema, type Product } from "./products.schema";

const productsFor = (query: Record<string, string>) =>
  parseEnvelope(productsSchema, mockGet("products/", query)).data;

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

describe("products contract", () => {
  it.each(SCOPE_CASES)("sample response matches the schema for %o", (query) => {
    expect(productsFor(query).results.length).toBeGreaterThan(0);
  });

  it.each(SCOPE_CASES)("summary numbers equal the rows under them for %o", (query) => {
    const { results, categories, summary } = productsFor(query);

    expect(summary.revenue.value).toBe(sum(categories.map((category) => category.revenue)));
    expect(summary.units.value).toBe(sum(results.map((row) => row.units)));
    expect(summary.giftUnits.value).toBe(sum(results.map((row) => row.giftUnits)));
    expect(summary.stockOut).toBe(results.filter((row) => stockLevel(row) === "out").length);
    expect(summary.stockLow).toBe(results.filter((row) => stockLevel(row) === "low").length);
    for (const row of results) expect(row.units).toBe(row.deliveryUnits + row.clinicUnits);
  });

  it("product revenue is delivery revenue plus clinic shop sales for the whole business", () => {
    const { summary } = productsFor({ period: "30d" });

    expect(summary.revenue.value).toBe(sample.revenue.delivery + sample.clinic.mix.products);
  });

  it("matches the approved prototype numbers for the last 30 days", () => {
    const { summary, categories } = productsFor({ period: "30d" });

    expect(summary.units.value).toBe(9552);
    expect(summary.giftUnits.value).toBe(sample.liabilities.giftsCount);
    expect([summary.stockOut, summary.stockLow]).toEqual([2, 4]);
    expect(sum(categories.map((category) => category.sharePct))).toBeCloseTo(100, 0);
  });

  it("a category earns at least as much as its listed products", () => {
    const { results, categories } = productsFor({ period: "30d" });

    for (const category of categories) {
      const listed = sum(results.filter((row) => row.category === category.name).map((row) => row.revenue));
      expect(category.revenue).toBeGreaterThanOrEqual(listed);
    }
  });

  it("stock is a current state: it follows the filial, not the period", () => {
    const stockOf = (query: Record<string, string>) =>
      productsFor(query).results.map((row) => row.stockQuantity);

    expect(stockOf({ period: "today" })).toEqual(stockOf({ period: "year" }));
    expect(productsFor({ period: "30d", filial: "3" }).summary.stockOut).toBe(2);
  });

  it("has no comparison numbers when compare is none", () => {
    expect(productsFor({ period: "30d", compare: "none" }).summary.revenue.deltaPct).toBeNull();
  });
});

const product = (overrides: Partial<Product>): Product => ({
  id: 1,
  name: "A",
  category: null,
  units: 0,
  revenue: 0,
  sharePct: 0,
  deliveryUnits: 0,
  clinicUnits: 0,
  giftUnits: 0,
  stockQuantity: 10,
  isLow: false,
  trend: [],
  ...overrides,
});

describe("stockLevel", () => {
  it("puts sold-out before low, and leaves untracked products unmarked", () => {
    expect(stockLevel({ stockQuantity: 0, isLow: true })).toBe("out");
    expect(stockLevel({ stockQuantity: 4, isLow: true })).toBe("low");
    expect(stockLevel({ stockQuantity: 212, isLow: false })).toBe("ok");
    expect(stockLevel({ stockQuantity: null, isLow: false })).toBe("untracked");
  });
});

describe("ordering", () => {
  it("ranks products and categories by revenue without touching the input", () => {
    const products = [
      product({ id: 1, revenue: 10 }),
      product({ id: 2, revenue: 30 }),
      product({ id: 3, revenue: 20 }),
    ];
    const categories = [
      { name: "a", revenue: 5, sharePct: 25 },
      { name: "b", revenue: 15, sharePct: 75 },
    ];

    expect(rankProducts(products).map((row) => row.id)).toEqual([2, 3, 1]);
    expect(products.map((row) => row.id)).toEqual([1, 2, 3]);
    expect(sortCategories(categories).map((row) => row.name)).toEqual(["b", "a"]);
  });

  it("gives the bar width relative to the best value", () => {
    expect(shareOfMax(206, 412)).toBe(50);
    expect(shareOfMax(1, 0)).toBe(0);
  });
});
