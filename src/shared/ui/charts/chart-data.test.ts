import { describe, expect, it } from "vitest";

import { chartTotals, isChartEmpty, toChartRows, toChartTable, type ChartData } from "./chart-data";

const data: ChartData = {
  labels: ["01.10", "02.10"],
  series: [
    { key: "delivery", name: "Yetkazib berish", color: "var(--series-1)", values: [60, 48] },
    { key: "clinic", name: "Klinika", color: "var(--series-2)", values: [17, 12] },
  ],
  compare: { name: "Oldingi davr", values: [55, 44] },
};

describe("toChartRows", () => {
  it("builds one row per label with every series and the compare line", () => {
    expect(toChartRows(data)).toEqual([
      { label: "01.10", delivery: 60, clinic: 17, __compare: 55 },
      { label: "02.10", delivery: 48, clinic: 12, __compare: 44 },
    ]);
  });

  it("fills a missing point with zero instead of undefined", () => {
    const short: ChartData = {
      labels: ["a", "b"],
      series: [{ key: "x", name: "X", color: "c", values: [1] }],
    };
    expect(toChartRows(short)[1]).toEqual({ label: "b", x: 0 });
  });
});

describe("toChartTable", () => {
  it("is the table twin of the chart: every value, formatted", () => {
    const table = toChartTable(data, "Davr", (value) => `${value} mln`);

    expect(table.headers).toEqual(["Davr", "Yetkazib berish", "Klinika", "Oldingi davr"]);
    expect(table.rows[0]).toEqual(["01.10", "60 mln", "17 mln", "55 mln"]);
  });
});

describe("chartTotals / isChartEmpty", () => {
  it("sums the stack per label", () => {
    expect(chartTotals(data)).toEqual([77, 60]);
  });

  it("treats all-zero or label-less data as empty", () => {
    expect(isChartEmpty(data)).toBe(false);
    expect(isChartEmpty({ labels: [], series: [] })).toBe(true);
    expect(isChartEmpty({ labels: ["a"], series: [{ key: "x", name: "X", color: "c", values: [0] }] })).toBe(
      true,
    );
  });
});
