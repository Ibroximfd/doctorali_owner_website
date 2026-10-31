import { describe, expect, it } from "vitest";

import {
  DEFAULT_SCOPE,
  addDays,
  includesToday,
  paramsKey,
  scopeKey,
  scopeRange,
  scopeToParams,
  tashkentDate,
  toggleFilialFocus,
  withoutFilial,
  type Scope,
} from "./scope";

const TODAY = "2026-10-02";
const scope = (overrides: Partial<Scope>): Scope => ({ ...DEFAULT_SCOPE, ...overrides });

describe("tashkentDate", () => {
  it("uses the Tashkent calendar day, not UTC", () => {
    // 20:30 UTC on the 1st is already 01:30 on the 2nd in Tashkent.
    expect(tashkentDate(new Date("2026-10-01T20:30:00Z"))).toBe("2026-10-02");
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-10-02", -2)).toBe("2026-09-30");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("scopeToParams", () => {
  it("sends presets as-is with the compare mode", () => {
    expect(scopeToParams(scope({ period: "7d" }), TODAY)).toEqual({ period: "7d", compare: "previous" });
  });

  it("sends 90 days as a custom range because the API has no such preset", () => {
    expect(scopeToParams(scope({ period: "90d" }), TODAY)).toEqual({
      period: "custom",
      date_from: "2026-07-05",
      date_to: TODAY,
      compare: "previous",
    });
  });

  it("joins filials in a stable order", () => {
    expect(scopeToParams(scope({ filials: [3, 1] }), TODAY).filial).toBe("1,3");
    expect(scopeToParams(scope({ filials: [] }), TODAY).filial).toBeUndefined();
  });

  it("falls back to 30 days when a custom range is broken", () => {
    expect(
      scopeToParams(scope({ period: "custom", from: "2026-10-05", to: "2026-10-01" }), TODAY).period,
    ).toBe("30d");
    expect(scopeToParams(scope({ period: "custom", from: "nonsense", to: null }), TODAY).period).toBe("30d");
  });

  it("passes a valid custom range through", () => {
    expect(
      scopeToParams(scope({ period: "custom", from: "2026-09-01", to: "2026-09-30" }), TODAY),
    ).toMatchObject({
      period: "custom",
      date_from: "2026-09-01",
      date_to: "2026-09-30",
    });
  });
});

describe("scopeKey", () => {
  it("is identical for the same scope regardless of filial order", () => {
    expect(scopeKey(scope({ filials: [2, 1] }), TODAY)).toEqual(scopeKey(scope({ filials: [1, 2] }), TODAY));
  });

  it("differs when the period changes", () => {
    expect(scopeKey(scope({ period: "7d" }), TODAY)).not.toEqual(scopeKey(scope({ period: "30d" }), TODAY));
  });
});

describe("withoutFilial", () => {
  it("drops only the filial filter and leaves the input untouched", () => {
    const params = scopeToParams(scope({ period: "7d", filials: [3] }), TODAY);

    expect(withoutFilial(params)).toEqual(scopeToParams(scope({ period: "7d" }), TODAY));
    expect(params.filial).toBe("3");
  });

  it("gives the same cache key whichever filial is selected", () => {
    const one = withoutFilial(scopeToParams(scope({ filials: [1] }), TODAY));
    const other = withoutFilial(scopeToParams(scope({ filials: [2, 3] }), TODAY));

    expect(paramsKey(one)).toEqual(paramsKey(other));
    expect(paramsKey({ b: "2", a: "1" })).toEqual(["a=1", "b=2"]);
  });
});

describe("toggleFilialFocus", () => {
  it("focuses one filial, replacing whatever was selected", () => {
    expect(toggleFilialFocus([], 3)).toEqual([3]);
    expect(toggleFilialFocus([1], 3)).toEqual([3]);
    expect(toggleFilialFocus([1, 3], 3)).toEqual([3]);
  });

  it("returns to all filials when the only selected one is toggled again", () => {
    expect(toggleFilialFocus([3], 3)).toEqual([]);
  });
});

describe("includesToday", () => {
  it("is false for closed periods", () => {
    expect(includesToday(scope({ period: "yesterday" }), TODAY)).toBe(false);
    expect(includesToday(scope({ period: "prev_month" }), TODAY)).toBe(false);
    expect(includesToday(scope({ period: "custom", from: "2026-09-01", to: "2026-09-30" }), TODAY)).toBe(
      false,
    );
  });

  it("is true for periods that reach today", () => {
    expect(includesToday(scope({ period: "30d" }), TODAY)).toBe(true);
    expect(includesToday(scope({ period: "custom", from: "2026-09-20", to: TODAY }), TODAY)).toBe(true);
  });
});

describe("scopeRange", () => {
  const range = (period: Scope["period"], from: string | null = null, to: string | null = null) =>
    scopeRange({ ...DEFAULT_SCOPE, period, from, to }, "2026-10-31");

  it("turns presets into exact dates for date-based APIs", () => {
    expect(range("today")).toEqual({ dateFrom: "2026-10-31", dateTo: "2026-10-31" });
    expect(range("7d")).toEqual({ dateFrom: "2026-10-25", dateTo: "2026-10-31" });
    expect(range("30d")).toEqual({ dateFrom: "2026-10-02", dateTo: "2026-10-31" });
    expect(range("prev_month")).toEqual({ dateFrom: "2026-09-01", dateTo: "2026-09-30" });
    expect(range("custom", "2026-08-01", "2026-08-10")).toEqual({
      dateFrom: "2026-08-01",
      dateTo: "2026-08-10",
    });
  });
});
