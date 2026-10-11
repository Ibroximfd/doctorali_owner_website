import { describe, expect, it } from "vitest";
import { z } from "zod";

import { metricSchema, parseEnvelope, timeseriesSchema } from "@/shared/lib/envelope";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import {
  agingBucketKey,
  agingColorClass,
  averageDailyInflow,
  biggestExpense,
  cashPositionTotals,
  debtTotals,
  differenceKind,
  flowSeries,
  formatSigned,
  isClosingStatus,
  overdueTone,
  paymentColorIndex,
  periodDays,
  sharePct,
  totalLiabilities,
} from "./finance.rules";
import {
  cashPositionSchema,
  dailyClosingsSchema,
  debtsSchema,
  expensesSchema,
  financeSummarySchema,
  liabilitiesSchema,
  paymentMixSchema,
  returnsSchema,
} from "./finance.schema";

type Query = Record<string, string>;

const MONTH: Query = { period: "30d" };

const summaryFor = (query: Query) => parseEnvelope(financeSummarySchema, mockGet("finance/summary/", query));
const cashflowFor = (query: Query) =>
  parseEnvelope(timeseriesSchema, mockGet("finance/cashflow/", query)).data;
const positionFor = (query: Query) =>
  parseEnvelope(cashPositionSchema, mockGet("finance/cash-position/", query)).data;
const paymentMixFor = (query: Query) =>
  parseEnvelope(paymentMixSchema, mockGet("finance/payment-mix/", query)).data;
const expensesFor = (query: Query) => parseEnvelope(expensesSchema, mockGet("finance/expenses/", query)).data;
const liabilitiesFor = (query: Query) =>
  parseEnvelope(liabilitiesSchema, mockGet("finance/liabilities/", query)).data;
const returnsFor = (query: Query) => parseEnvelope(returnsSchema, mockGet("finance/returns/", query)).data;
const debtsFor = (query: Query) => parseEnvelope(debtsSchema, mockGet("finance/debts/", query)).data;
const closingsFor = (query: Query) =>
  parseEnvelope(dailyClosingsSchema, mockGet("finance/daily-closings/", query)).data;

/** Boshqa bo'lim sxemasini import qilmasdan `overview/` dan faqat kerakli raqamlarni o'qiydi. */
const overviewSchema = z.object({
  revenue: z.object({ total: metricSchema }),
  cash_position: z.object({
    clinic_tills: z.number(),
    courier_cod: z.number(),
    online_received: z.number(),
    open_debt: z.number(),
    overdue_debt: z.number(),
  }),
});
const overviewFor = (query: Query) => parseEnvelope(overviewSchema, mockGet("overview/", query)).data;

const total = (values: readonly number[]): number => values.reduce((sum, value) => sum + value, 0);
const seriesOf = (query: Query, key: string): number[] =>
  cashflowFor(query).series.find((series) => series.key === key)?.values ?? [];

describe("finance contract", () => {
  it.each(SCOPE_CASES)("every endpoint sample matches its schema for %o", (query) => {
    expect(() => {
      summaryFor(query);
      cashflowFor(query);
      positionFor(query);
      paymentMixFor(query);
      expensesFor(query);
      liabilitiesFor(query);
      returnsFor(query);
      debtsFor(query);
      closingsFor(query);
    }).not.toThrow();
  });

  it.each(SCOPE_CASES)("revenue equals the Overview total for %o", (query) => {
    expect(summaryFor(query).data.revenue).toEqual(overviewFor(query).revenue.total);
  });

  it("has no comparison numbers when compare is none", () => {
    const { revenue, netCash } = summaryFor({ period: "30d", compare: "none" }).data;

    expect(revenue.previous).toBeNull();
    expect(netCash.deltaPct).toBeNull();
  });
});

describe("finance consistency", () => {
  it.each(SCOPE_CASES)("net cash is collected minus expenses for %o", (query) => {
    const { collected, expenses, netCash } = summaryFor(query).data;

    expect(netCash.value ?? 0).toBe((collected.value ?? 0) - (expenses.value ?? 0));
  });

  it.each(SCOPE_CASES)("cashflow adds up to the summary and has one value per label for %o", (query) => {
    const { collected, expenses } = summaryFor(query).data;
    const { labels, series } = cashflowFor(query);
    const [inflow, outflow, net] = [
      seriesOf(query, "inflow"),
      seriesOf(query, "outflow"),
      seriesOf(query, "net"),
    ];

    for (const item of series) expect(item.values).toHaveLength(labels.length);
    expect(total(inflow)).toBe(collected.value);
    expect(total(outflow)).toBe(expenses.value);
    expect(net).toEqual(inflow.map((value, index) => value - (outflow[index] ?? 0)));
  });

  it.each(SCOPE_CASES)("payment methods add up to the revenue for %o", (query) => {
    expect(total(paymentMixFor(query).map((row) => row.amount))).toBe(summaryFor(query).data.revenue.value);
  });

  it.each(SCOPE_CASES)("expense categories add up to the expense total for %o", (query) => {
    const expenses = expensesFor(query);

    expect(total(expenses.byCategory.map((row) => row.amount))).toBe(expenses.total.value);
    expect(expenses.total.value).toBe(summaryFor(query).data.expenses.value);
  });

  it("refunds are the same number in the summary and in returns", () => {
    expect(returnsFor(MONTH).refundAmount).toBe(summaryFor(MONTH).data.refunds.value);
  });

  it("the money position matches the Overview for the whole business", () => {
    const totals = cashPositionTotals(positionFor(MONTH));
    const overview = overviewFor(MONTH).cashPosition;

    expect(totals.tills).toBe(overview.clinicTills);
    expect(totals.courierCod).toBe(overview.courierCod);
    expect(totals.online).toBe(overview.onlineReceived);
    expect(totals.openDebt).toBe(overview.openDebt);
    expect(totals.overdueDebt).toBe(overview.overdueDebt);
  });

  it.each(SCOPE_CASES)("open debt is the sum of the aging buckets for %o", (query) => {
    expect(debtTotals(debtsFor(query)).amount).toBe(positionFor(query).debts.open);
  });

  it("a branch without a clinic has no tills, debts or closings", () => {
    const samarqand = { period: "30d", filial: "3" };

    expect(positionFor(samarqand).clinicTills).toEqual([]);
    expect(debtTotals(debtsFor(samarqand))).toEqual({ amount: 0, clients: 0 });
    expect(debtsFor(samarqand).topDebtors).toEqual([]);
    expect(closingsFor(samarqand)).toEqual([]);
  });

  it("closings stay inside the selected period and the difference is counted minus expected", () => {
    expect(closingsFor({ period: "today" })).toEqual([]);
    expect(closingsFor({ period: "yesterday" }).map((row) => row.date)).toEqual(["2026-10-01", "2026-10-01"]);

    for (const row of closingsFor(MONTH))
      expect(row.difference).toBe((row.countedCash ?? 0) - row.expectedCash);
  });
});

describe("cashflow rules", () => {
  it("draws inflow and outflow only, in a fixed order", () => {
    expect(flowSeries(cashflowFor(MONTH)).map((series) => series.key)).toEqual(["inflow", "outflow"]);
    expect(flowSeries({ labels: [], series: [{ key: "net", values: [] }] })).toEqual([]);
  });

  it("counts calendar days with both ends included", () => {
    expect(periodDays({ from: "2026-09-03", to: "2026-10-02" })).toBe(30);
    expect(periodDays({ from: "2026-10-02", to: "2026-10-02" })).toBe(1);
    expect(periodDays({ from: "nonsense", to: "2026-10-02" })).toBe(1);
  });

  it("averages the inflow over the days of the period", () => {
    expect(averageDailyInflow(300_000_000, { from: "2026-09-03", to: "2026-10-02" })).toBe(10_000_000);
  });

  it("finds the biggest expense category", () => {
    expect(biggestExpense(expensesFor(MONTH))?.category).toBe("salary");
    expect(biggestExpense({ ...expensesFor(MONTH), byCategory: [] })).toBeNull();
  });

  it("gives a share of zero when there is nothing to divide by", () => {
    expect(sharePct(412, 2251)).toBe(18.3);
    expect(sharePct(5, 0)).toBe(0);
  });
});

describe("money position and liabilities rules", () => {
  it("splits the tills by payment type and counts couriers holding cash", () => {
    const totals = cashPositionTotals(positionFor(MONTH));

    expect(totals).toMatchObject({ cash: 11_200_000, card: 4_100_000, terminal: 3_100_000, courierCount: 6 });
    expect(totals.tills).toBe(totals.cash + totals.card + totals.terminal);
  });

  it("adds commission, doctor payouts, cashback and gifts into one liability", () => {
    expect(totalLiabilities(liabilitiesFor(MONTH))).toBe(115_100_000);
  });

  it("keeps a payment method on its own colour and moves unknown ones past the known", () => {
    expect(paymentColorIndex("cash", 4)).toBe(0);
    expect(paymentColorIndex("terminal", 0)).toBe(4);
    expect(paymentColorIndex("uzcard_qr", 1)).toBe(6);
  });
});

describe("debt and closing rules", () => {
  it("maps known aging buckets to labels and leaves unknown ones alone", () => {
    expect(agingBucketKey("31+")).toBe("older");
    expect(agingBucketKey("90+")).toBeNull();
  });

  it("darkens the colour with the age of the debt and never runs out of steps", () => {
    expect([0, 1, 2, 7].map(agingColorClass)).toEqual(["bg-seq-3", "bg-seq-4", "bg-seq-6", "bg-seq-6"]);
  });

  it("escalates the overdue pill after a week and after a month", () => {
    expect([5, 7, 8, 30, 31].map(overdueTone)).toEqual(["neutral", "neutral", "warn", "warn", "crit"]);
  });

  it("tells a shortage from a surplus and signs the amount", () => {
    expect([-180_000, 20_000, 0].map(differenceKind)).toEqual(["shortage", "surplus", "even"]);
    expect(formatSigned(-180_000)).toBe("−180\u00a0000");
    expect(formatSigned(20_000)).toBe("+20\u00a0000");
    expect(formatSigned(0)).toBe("0");
  });

  it("recognises only the contract's closing statuses", () => {
    expect(isClosingStatus("reopened")).toBe(true);
    expect(isClosingStatus("archived")).toBe(false);
  });
});
