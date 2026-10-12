import { describe, expect, it } from "vitest";

import { TEST_NOW } from "@/shared/testing/mock-api";

import { buildContext, resolvePeriod } from "./engine";

const period = (query: Record<string, string>) => resolvePeriod(new URLSearchParams(query), TEST_NOW);
const context = (query: Record<string, string> = {}) =>
  buildContext({ searchParams: new URLSearchParams(query), now: TEST_NOW });

describe("resolvePeriod", () => {
  it("today is hourly up to the current Tashkent hour", () => {
    const today = period({ period: "today" });

    expect(today.from).toBe("2026-10-02");
    expect(today.granularity).toBe("hour");
    // 09:05 UTC = 14:05 Tashkent → soatlar 00..14
    expect(today.labels).toHaveLength(15);
    expect(today.labels.at(-1)).toBe("2026-10-02T14:00:00+05:00");
  });

  it("30d covers thirty calendar days ending today", () => {
    const month = period({ period: "30d" });

    expect(month.labels).toHaveLength(30);
    expect(month.from).toBe("2026-09-03");
    expect(month.to).toBe("2026-10-02");
    expect(month.scale).toBe(1);
  });

  it("prev_month is the whole previous calendar month", () => {
    const previous = period({ period: "prev_month" });

    expect(previous.from).toBe("2026-09-01");
    expect(previous.to).toBe("2026-09-30");
  });

  it("year is monthly, twelve buckets", () => {
    const year = period({ period: "year" });

    expect(year.granularity).toBe("month");
    expect(year.labels).toHaveLength(12);
    expect(year.labels[0]).toBe("2025-11-01");
  });

  it("a 90-day custom range is weekly", () => {
    const custom = period({ period: "custom", date_from: "2026-07-05", date_to: "2026-10-02" });

    expect(custom.days).toBe(90);
    expect(custom.granularity).toBe("week");
  });

  it("an invalid custom range falls back to 30 days", () => {
    expect(period({ period: "custom", date_from: "2026-10-05", date_to: "2026-10-01" }).key).toBe("30d");
  });
});

describe("buildContext", () => {
  it("defaults to all filials and scales flows by the selected share", () => {
    expect(context({ period: "30d" }).flow(1000)).toBe(1000);
    expect(context({ period: "30d", filial: "3" }).flow(1000)).toBe(180);
    expect(context({ period: "30d", filial: "1,2" }).isAllFilials).toBe(false);
  });

  it("distributes a total across the period without losing it", () => {
    const values = context({ period: "30d" }).series(3_000_000, 7);

    expect(values).toHaveLength(30);
    const sum = values.reduce((total, value) => total + value, 0);
    expect(Math.abs(sum - 3_000_000)).toBeLessThan(30);
  });

  it("is deterministic for the same seed", () => {
    expect(context({ period: "7d" }).series(1000, 3)).toEqual(context({ period: "7d" }).series(1000, 3));
  });

  it("drops comparison values when compare is none", () => {
    expect(context({ compare: "none" }).metric(100, 10)).toEqual({
      value: 100,
      previous: null,
      delta_pct: null,
      unit: undefined,
    });
    expect(context({ period: "30d" }).metric(110, 10).previous).toBe(100);
  });
});
