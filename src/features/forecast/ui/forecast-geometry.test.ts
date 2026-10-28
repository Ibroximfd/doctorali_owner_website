import { describe, expect, it } from "vitest";

import { buildForecastGeometry, INNER_BAND_RATIO, niceTicks } from "./forecast-geometry";

const series = {
  labels: ["d1", "d2", "d3", "d4", "d5"],
  actual: [100, 120, 110, null, null],
  forecast: [null, null, 110, 130, 150],
  low: [null, null, 100, 110, 120],
  high: [null, null, 120, 150, 180],
  todayIndex: 2,
};

describe("forecast geometry", () => {
  it("builds nice ticks covering the range", () => {
    expect(niceTicks(95, 182)).toEqual([75, 100, 125, 150, 175, 200]);
    expect(niceTicks(5, 5)).toEqual([5]);
  });

  it("splits history and horizon on today and puts the inner cone inside the outer", () => {
    const geometry = buildForecastGeometry(series, { width: 600, height: 300 });
    expect(geometry.actualPath.split("L")).toHaveLength(3);
    expect(geometry.forecastPath.startsWith("M")).toBe(true);
    expect(geometry.today).toEqual({ x: geometry.xOf(2), y: geometry.yOf(110) });
    expect(geometry.peak?.value).toBe(120);
    expect(geometry.end?.value).toBe(150);

    const top = (value: number) => geometry.yOf(value);
    // ichki konusning yuqori chegarasi tashqisidan pastroqda (SVG da y kattaroq)
    expect(top(150 + (180 - 150) * INNER_BAND_RATIO)).toBeGreaterThan(top(180));
    expect(geometry.outerBand.endsWith("Z")).toBe(true);
    expect(geometry.innerBand.endsWith("Z")).toBe(true);
  });

  it("maps the pointer to the nearest day", () => {
    const geometry = buildForecastGeometry(series, { width: 600, height: 300 });
    expect(geometry.indexAt(geometry.xOf(3) + 2)).toBe(3);
    expect(geometry.indexAt(-50)).toBe(0);
    expect(geometry.indexAt(5000)).toBe(4);
  });
});
