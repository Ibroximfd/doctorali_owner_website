import { describe, expect, it } from "vitest";

import { parseEnvelope, timeseriesSchema } from "@/shared/lib/envelope";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import { cohortMonths, isMixSeries, retainedCustomers, retentionStep, topRegions } from "./customers.rules";
import {
  cohortsSchema,
  customerRegionsSchema,
  customersSummarySchema,
  topCustomersSchema,
} from "./customers.schema";

type Query = Record<string, string>;

const summaryFor = (query: Query) =>
  parseEnvelope(customersSummarySchema, mockGet("customers/summary/", query)).data;
const mixFor = (query: Query) =>
  parseEnvelope(timeseriesSchema, mockGet("customers/timeseries/", query)).data;
const cohortsFor = (query: Query) => parseEnvelope(cohortsSchema, mockGet("customers/cohorts/", query)).data;
const topFor = (query: Query) => parseEnvelope(topCustomersSchema, mockGet("customers/top/", query)).data;
const regionsFor = (query: Query) =>
  parseEnvelope(customerRegionsSchema, mockGet("customers/regions/", query)).data;

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
const seriesTotal = (query: Query, key: string): number =>
  sum(mixFor(query).series.find((series) => series.key === key)?.values ?? []);

describe("customers contract", () => {
  it.each(SCOPE_CASES)("every sample response matches its schema for %o", (query) => {
    expect(() => {
      summaryFor(query);
      topFor(query);
    }).not.toThrow();
    expect(cohortsFor(query)).toHaveLength(6);
    expect(regionsFor(query)).toHaveLength(14);
    expect(mixFor(query).series.map((series) => series.key)).toEqual(["returning", "new"]);
  });

  it.each(SCOPE_CASES)("the chart and the region list add up to the headline numbers for %o", (query) => {
    const summary = summaryFor(query);
    const mix = mixFor(query);

    expect(seriesTotal(query, "new")).toBe(summary.new.value);
    expect(sum(regionsFor(query).map((region) => region.customers))).toBe(summary.total.value);
    for (const series of mix.series) expect(series.values).toHaveLength(mix.labels.length);
  });

  it("new customers match the overview KPI, and the returning share matches the chart", () => {
    const query = { period: "30d" };
    const summary = summaryFor(query);
    const [fresh, returning] = [seriesTotal(query, "new"), seriesTotal(query, "returning")];

    expect(summary.new.value).toBe(1284);
    expect(summary.total.value).toBe(61_300);
    expect((returning / (fresh + returning)) * 100).toBeCloseTo(summary.returningRate.value ?? 0, 1);
  });

  it("the customer base does not depend on the period, only on the filial", () => {
    expect(summaryFor({ period: "today" }).total.value).toBe(summaryFor({ period: "year" }).total.value);
    expect(summaryFor({ period: "30d", filial: "3" }).total.value).toBeLessThan(
      summaryFor({ period: "30d" }).total.value ?? 0,
    );
  });

  it("has no comparison numbers when compare is none", () => {
    const summary = summaryFor({ period: "30d", compare: "none" });

    expect(summary.total.deltaPct).toBeNull();
    expect(summary.returningRate.previous).toBeNull();
  });

  it("cohorts are the last six months, oldest first, each starting at 100%", () => {
    const cohorts = cohortsFor({ period: "30d" });

    expect(cohorts.map((cohort) => cohort.cohort)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
    expect(cohorts.map((cohort) => cohort.retention.length)).toEqual([6, 5, 4, 3, 2, 1]);
    for (const cohort of cohorts) expect(cohort.retention[0]).toBe(100);
  });

  it("top customers come richest first with a parseable last order time", () => {
    const top = topFor({ period: "30d" });
    const spent = top.map((customer) => customer.totalSpent);

    expect(spent).toEqual([...spent].sort((a, b) => b - a));
    expect(top.every((customer) => !Number.isNaN(Date.parse(customer.lastOrderAt ?? "")))).toBe(true);
  });
});

describe("retentionStep", () => {
  it("gives month 0 the darkest step and spreads the rest over nine-point bands", () => {
    expect(retentionStep(100)).toBe(5);
    expect(retentionStep(41)).toBe(4);
    expect(retentionStep(36)).toBe(3);
    expect(retentionStep(27)).toBe(2);
    expect(retentionStep(17)).toBe(1);
    expect(retentionStep(9)).toBe(0);
  });

  it("stays inside the scale for out-of-range values", () => {
    expect(retentionStep(0)).toBe(0);
    expect(retentionStep(99)).toBe(4);
  });
});

describe("cohort helpers", () => {
  it("counts the customers behind a retention percentage", () => {
    expect(retainedCustomers(1108, 36)).toBe(399);
  });

  it("builds month columns up to the longest cohort", () => {
    const cohorts = [
      { cohort: "2026-08", size: 10, retention: [100, 41] },
      { cohort: "2026-09", size: 10, retention: [100] },
    ];

    expect(cohortMonths(cohorts)).toEqual([0, 1]);
    expect(cohortMonths([])).toEqual([]);
  });
});

describe("topRegions", () => {
  const regions = [
    { region: "a", customers: 10, revenue: 0 },
    { region: "b", customers: 60, revenue: 0 },
    { region: "c", customers: 30, revenue: 0 },
  ];

  it("keeps the biggest regions and reports each share of the whole base, not of the shown ones", () => {
    expect(topRegions(regions, 2)).toEqual([
      { region: "b", customers: 60, revenue: 0, sharePct: 60 },
      { region: "c", customers: 30, revenue: 0, sharePct: 30 },
    ]);
  });

  it("shows the seven most active regions of the sample", () => {
    const top = topRegions(regionsFor({ period: "30d" }));

    expect(top).toHaveLength(7);
    expect(top[0]?.region).toBe("toshkent_shahar");
  });

  it("survives an empty base", () => {
    expect(topRegions([{ region: "a", customers: 0, revenue: 0 }])[0]?.sharePct).toBe(0);
  });
});

describe("isMixSeries", () => {
  it("recognises only the new and returning series", () => {
    expect(isMixSeries("new")).toBe(true);
    expect(isMixSeries("returning")).toBe(true);
    expect(isMixSeries("churned")).toBe(false);
  });
});
