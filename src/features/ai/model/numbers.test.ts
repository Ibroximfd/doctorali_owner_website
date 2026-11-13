import { describe, expect, it } from "vitest";

import { formatCell, isNumericColumn, parseNumericCell } from "./numbers";

describe("parseNumericCell", () => {
  it("reads grouped, decimal, percent and unit values", () => {
    expect(parseNumericCell("12450000")).toEqual({
      value: 12450000,
      decimals: 0,
      percent: false,
      unit: null,
    });
    expect(parseNumericCell("12 450 000 so'm")).toMatchObject({ value: 12450000, unit: "so'm" });
    expect(parseNumericCell("12,450,000")).toMatchObject({ value: 12450000, decimals: 0 });
    expect(parseNumericCell("1.234.567")).toMatchObject({ value: 1234567 });
    expect(parseNumericCell("4,5")).toMatchObject({ value: 4.5, decimals: 1 });
    expect(parseNumericCell("1 234,56")).toMatchObject({ value: 1234.56, decimals: 2 });
    expect(parseNumericCell("18.2%")).toMatchObject({ value: 18.2, percent: true });
    expect(parseNumericCell("-3")).toMatchObject({ value: -3 });
  });

  it("leaves ids, dates, phones and years as text", () => {
    for (const raw of ["DA-184011", "13.11.2026", "+998 90 123 45 67", "2026", "312 mln so'm", "T2", ""])
      expect(parseNumericCell(raw)).toBeNull();
  });
});

/** Ajratuvchi — uzilmaydigan bo'shliq; solishtirishda oddiy bo'shliq. */
const spaced = (raw: string) => formatCell(raw).replace(/\u00a0/g, " ");

describe("formatCell", () => {
  it("uses the panel number format", () => {
    expect(spaced("12450000")).toBe("12 450 000");
    expect(spaced("12450000 so'm")).toBe("12 450 000 so'm");
    expect(spaced("18.25%")).toBe("18,25%");
    expect(spaced("4.5")).toBe("4,5");
    expect(spaced("Qo'qon")).toBe("Qo'qon");
  });
});

describe("isNumericColumn", () => {
  it("needs at least half of the filled cells to be numbers", () => {
    expect(isNumericColumn(["42", "—", "12 450 000", "18%"])).toBe(true);
    expect(isNumericColumn(["Qo'qon", "Farg'ona", "42"])).toBe(false);
    expect(isNumericColumn(["", "—"])).toBe(false);
  });
});
