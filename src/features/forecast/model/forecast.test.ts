import { describe, expect, it } from "vitest";

import { parseEnvelope } from "@/shared/lib/envelope";
import { mockGet } from "@/shared/testing/mock-api";

import { spreadPct, toForecastRows } from "./forecast.rules";
import {
  forecastRegionsSchema,
  forecastSeriesSchema,
  forecastSummarySchema,
  stockoutsSchema,
} from "./forecast.schema";

const HORIZONS = ["7", "30", "90"];

describe("forecast contract", () => {
  it.each(HORIZONS)("every sample response matches its schema for horizon %s", (horizon) => {
    expect(() => {
      parseEnvelope(forecastSummarySchema, mockGet("forecast/summary/", { horizon }));
      parseEnvelope(forecastSeriesSchema, mockGet("forecast/timeseries/", { horizon, metric: "revenue" }));
      parseEnvelope(forecastSeriesSchema, mockGet("forecast/timeseries/", { horizon, metric: "orders" }));
      parseEnvelope(stockoutsSchema, mockGet("forecast/stockouts/", { horizon }));
      parseEnvelope(forecastRegionsSchema, mockGet("forecast/regions/", { horizon }));
    }).not.toThrow();
  });

  it("joins history and forecast on today and keeps the band around the forecast", () => {
    const series = parseEnvelope(
      forecastSeriesSchema,
      mockGet("forecast/timeseries/", { horizon: "30" }),
    ).data;
    expect(series.labels).toHaveLength(90);
    expect(series.forecast[series.todayIndex]).toBe(series.actual[series.todayIndex]);
    expect(series.actual.at(-1)).toBeNull();
    const rows = toForecastRows(series, (label) => label);
    const future = rows.filter((row) => row.isFuture);
    expect(future).toHaveLength(30);
    for (const row of future) {
      expect(row.band?.[0]).toBeLessThanOrEqual(row.forecast ?? 0);
      expect(row.band?.[1]).toBeGreaterThanOrEqual(row.forecast ?? 0);
    }
  });

  it("rejects arrays that do not match the labels", () => {
    expect(() =>
      forecastSeriesSchema.parse({
        labels: ["a", "b"],
        actual: [1],
        forecast: [1, 2],
        low: [1, 2],
        high: [1, 2],
        today_index: 0,
      }),
    ).toThrow();
  });

  it("measures the spread of a range", () => {
    expect(spreadPct({ expected: 100, low: 90, high: 110 })).toBe(10);
    expect(spreadPct({ expected: 0, low: 0, high: 0 })).toBeNull();
  });
});
