import { describe, expect, it } from "vitest";

import { focusViewBox, projectLatLng, UZ_REGION_BOUNDS } from "@/shared/config/uz-map";
import { parseEnvelope } from "@/shared/lib/envelope";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import { isCashAlert, metricTone, regionScore } from "./regions.rules";
import { regionLiveSchema, regionsSchema } from "./regions.schema";

describe("regions contract", () => {
  it.each(SCOPE_CASES)("list matches the schema for %o", (query) => {
    expect(() => parseEnvelope(regionsSchema, mockGet("regions/", query))).not.toThrow();
  });

  it("live couriers match the region's courier total", () => {
    const rows = parseEnvelope(regionsSchema, mockGet("regions/", { period: "30d" })).data;
    for (const row of rows) {
      const live = parseEnvelope(regionLiveSchema, mockGet(`regions/${row.region}/live/`)).data;
      expect(live.couriers).toHaveLength(row.couriersTotal);
      expect(live.summary.stockUnits).toBe(row.stockUnits);
    }
  });
});

describe("regions rules and projection", () => {
  it("colours each metric by its own thresholds", () => {
    const base = {
      region: "x",
      orders: 10,
      delivered: 8,
      cancelled: 2,
      revenue: 0,
      successRate: 80,
      growthPct: null,
      stockUnits: 10,
      stockValue: 0,
      lowSkus: 0,
      couriersTotal: 4,
      couriersWorking: 1,
      cashOnCouriers: 0,
    };
    expect(metricTone(base, "delivery")).toBe("good");
    expect(metricTone(base, "stock")).toBe("good");
    expect(metricTone({ ...base, lowSkus: 3 }, "stock")).toBe("bad");
    expect(metricTone(base, "couriers")).toBe("watch");
    expect(metricTone({ ...base, orders: 0 }, "delivery")).toBe("none");
    expect(regionScore({ successRate: 100, orders: 2 })).toBe(-1);
  });

  it("projects Tashkent and Samarkand inside their regions", () => {
    const inside = (code: keyof typeof UZ_REGION_BOUNDS, lat: number, lng: number) => {
      const { x, y } = projectLatLng(lat, lng);
      const [bx, by, bw, bh] = UZ_REGION_BOUNDS[code];
      return x >= bx - 8 && x <= bx + bw + 8 && y >= by - 8 && y <= by + bh + 8;
    };
    expect(inside("toshkent_shahar", 41.31, 69.28)).toBe(true);
    expect(inside("samarqand", 39.65, 66.96)).toBe(true);
    expect(focusViewBox("samarqand").split(" ")).toHaveLength(4);
  });

  it("flags cash held too long", () => {
    const now = Date.parse("2026-10-28T12:00:00+05:00");
    expect(isCashAlert({ cashOnHand: 1_000_000, cashSince: "2026-10-27T06:00:00+05:00" }, now)).toBe(true);
    expect(isCashAlert({ cashOnHand: 0, cashSince: null }, now)).toBe(false);
  });
});
