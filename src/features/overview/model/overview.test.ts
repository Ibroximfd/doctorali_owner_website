import { describe, expect, it } from "vitest";

import { parseEnvelope, parseJson, timeseriesSchema } from "@/shared/lib/envelope";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import {
  activeChannels,
  feedDotClass,
  isStaleStage,
  planPace,
  stackSeries,
  todayTrend,
} from "./overview.rules";
import { feedSchema, overviewSchema } from "./overview.schema";

const overviewFor = (query: Record<string, string>) =>
  parseEnvelope(overviewSchema, mockGet("overview/", query)).data;

describe("overview contract", () => {
  it.each(SCOPE_CASES)("sample response matches the schema for %o", (query) => {
    expect(() => overviewFor(query)).not.toThrow();
  });

  it("total revenue is exactly the sum of the channels (nothing counted twice)", () => {
    const { revenue } = overviewFor({ period: "30d" });

    expect(revenue.total.value).toBe(
      (revenue.delivery.value ?? 0) + (revenue.clinic.value ?? 0) + (revenue.consultation.value ?? 0),
    );
  });

  it("filial rows add up to the all-filials total", () => {
    const { revenue, filials } = overviewFor({ period: "30d" });

    expect(filials.reduce((sum, row) => sum + (row.revenue.value ?? 0), 0)).toBe(revenue.total.value ?? 0);
  });

  it("has no comparison numbers when compare is none", () => {
    const { revenue, kpis } = overviewFor({ period: "30d", compare: "none" });

    expect(revenue.total.previous).toBeNull();
    expect(kpis.orders.deltaPct).toBeNull();
  });

  it("timeseries has one value per label in every series", () => {
    const { data } = parseEnvelope(timeseriesSchema, mockGet("overview/timeseries/", { period: "7d" }));

    expect(data.labels).toHaveLength(7);
    for (const series of data.series) expect(series.values).toHaveLength(7);
  });

  it("feed returns the requested number of events, newest first", () => {
    const { results } = parseJson(feedSchema, mockGet("feed/", { limit: "5" }));

    expect(results).toHaveLength(5);
    expect(Date.parse(results[0]?.at ?? "")).toBeGreaterThan(Date.parse(results[4]?.at ?? ""));
  });
});

describe("activeChannels", () => {
  it("drops the online channel when a single filial is selected", () => {
    const keys = activeChannels(overviewFor({ period: "30d", filial: "3" }).revenue).map(
      (channel) => channel.key,
    );

    expect(keys).toEqual(["delivery"]);
  });

  it("keeps all three for the whole business", () => {
    expect(activeChannels(overviewFor({ period: "30d" }).revenue)).toHaveLength(3);
  });
});

describe("planPace", () => {
  const plan = { month: "2026-10", target: 100, actual: 5, pct: 4.9, expectedPct: 5.1, previous: null };

  it("reports the gap to the expected pace in percentage points", () => {
    expect(planPace(plan)).toEqual({ gap: 0.2, isAhead: false });
    expect(planPace({ ...plan, pct: 6 })).toEqual({ gap: 0.9, isAhead: true });
  });
});

describe("feed and pipeline helpers", () => {
  it("gives unknown event kinds a neutral dot", () => {
    expect(feedDotClass("order.delivered")).toBe("bg-order-delivered");
    expect(feedDotClass("something.new")).toBe("bg-ink-3");
  });

  it("only in-progress stages can be stale", () => {
    expect(isStaleStage("shipping")).toBe(true);
    expect(isStaleStage("delivered")).toBe(false);
  });
});

describe("brief and river rules", () => {
  const quick = { today: 110, todaySameTimeYesterday: 100, yesterday: 0, week: 0, month: 0 };

  it("compares today with yesterday at the same time", () => {
    expect(todayTrend(quick)).toEqual({ kind: "up", pct: 10 });
    expect(todayTrend({ ...quick, today: 80 })).toEqual({ kind: "down", pct: 20 });
    expect(todayTrend({ ...quick, today: 100.5 }).kind).toBe("flat");
    expect(todayTrend({ ...quick, todaySameTimeYesterday: 0 }).kind).toBe("none");
  });

  it("stacks series on top of each other, ignoring negatives", () => {
    expect(stackSeries([{ values: [1, 2] }, { values: [3, -1] }, { values: [1] }])).toEqual([
      [1, 2],
      [4, 2],
      [5, 2],
    ]);
  });
});
