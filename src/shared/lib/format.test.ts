import { describe, expect, it } from "vitest";

import {
  formatBucket,
  formatDate,
  formatDecimal,
  formatDuration,
  formatMoney,
  formatMoneyCompact,
  formatMonth,
  formatNumber,
  formatPercent,
  formatPhone,
  formatTime,
  initialsOf,
} from "./format";

const NBSP = " ";

describe("formatNumber", () => {
  it("groups thousands with a non-breaking space", () => {
    expect(formatNumber(3860)).toBe(`3${NBSP}860`);
    expect(formatNumber(1_240_000)).toBe(`1${NBSP}240${NBSP}000`);
  });

  it("rounds to an integer and keeps the sign", () => {
    expect(formatNumber(612.6)).toBe("613");
    expect(formatNumber(-180_000)).toBe(`-180${NBSP}000`);
  });
});

describe("formatMoneyCompact", () => {
  it("uses billions with two decimals", () => {
    expect(formatMoneyCompact(2_332_000_000)).toBe(`2,33${NBSP}mlrd`);
  });

  it("uses whole millions from 100 mln and one decimal below", () => {
    expect(formatMoneyCompact(486_000_000)).toBe(`486${NBSP}mln`);
    expect(formatMoneyCompact(18_400_000)).toBe(`18,4${NBSP}mln`);
  });

  it("rounds before picking the unit, so nothing reads «1000 mln»", () => {
    expect(formatMoneyCompact(999_600_000)).toBe("1,00 mlrd");
    expect(formatMoneyCompact(99_960_000)).toBe("100 mln");
    expect(formatMoneyCompact(999_960)).toBe("1,0 mln");
    expect(formatMoneyCompact(1.5e12)).toBe("1 500,00 mlrd");
  });

  it("shows a dash for numbers that are not numbers, and never «-0»", () => {
    expect(formatMoneyCompact(Number.NaN)).toBe("—");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatPercent(-0.04)).toBe("0,0%");
    expect(formatNumber(-0.4)).toBe("0");
  });

  it("shows the full number below a million", () => {
    expect(formatMoneyCompact(612_000)).toBe(`612${NBSP}000`);
  });

  it("switches unit words with the locale", () => {
    expect(formatMoneyCompact(18_400_000, "ru")).toBe(`18,4${NBSP}млн`);
    expect(formatMoney(18_400_000, "uz")).toBe(`18,4${NBSP}mln${NBSP}so'm`);
  });
});

describe("formatPercent / formatDecimal", () => {
  it("uses a decimal comma", () => {
    expect(formatDecimal(4.86)).toBe("4,9");
    expect(formatPercent(12.6)).toBe("12,6%");
    expect(formatPercent(71, 0)).toBe("71%");
  });
});

describe("formatDuration", () => {
  it("renders hours and minutes", () => {
    expect(formatDuration(220)).toBe(`3${NBSP}s 40${NBSP}d`);
    expect(formatDuration(120)).toBe(`2${NBSP}s`);
    expect(formatDuration(50)).toBe(`50${NBSP}d`);
  });

  it("never goes negative", () => {
    expect(formatDuration(-5)).toBe(`0${NBSP}d`);
  });
});

describe("dates are rendered in Tashkent time", () => {
  it("shifts UTC to +05:00", () => {
    expect(formatTime("2026-10-02T09:05:00Z")).toBe("14:05");
    expect(formatDate("2026-10-01T20:30:00Z")).toBe("02.10.2026");
  });

  it("names the month with a capital letter", () => {
    expect(formatMonth("2026-10", "ru")).toBe("Октябрь");
  });
});

describe("formatBucket", () => {
  it("formats by granularity", () => {
    expect(formatBucket("2026-10-02T09:00:00+05:00", "hour")).toBe("09:00");
    expect(formatBucket("2026-09-03", "day")).toBe("03.09");
    expect(formatBucket("2026-09-01", "month")).toBe("Sen");
    expect(formatBucket("2026-09-01", "month", "ru")).toBe("Сен");
  });
});

describe("formatPhone / initialsOf", () => {
  it("spaces an Uzbek number and leaves other shapes alone", () => {
    expect(formatPhone("+998901234567")).toBe("+998 90 123 45 67");
    expect(formatPhone("+998 90 *** ** 67")).toBe("+998 90 *** ** 67");
  });

  it("takes the first two initials", () => {
    expect(initialsOf("Dilnoza Karimova")).toBe("DK");
    expect(initialsOf("  Boshliq ")).toBe("B");
  });
});
