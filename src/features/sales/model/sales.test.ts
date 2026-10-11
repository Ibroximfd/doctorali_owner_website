import { describe, expect, it } from "vitest";

import { parseEnvelope } from "@/shared/lib/envelope";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import {
  callTotals,
  companySalesPerOperator,
  filialColorIndex,
  gapDirection,
  isCallSeries,
  isHighConversion,
  isLaggingFilial,
  leadKindBarClass,
  operatorsWithMissedCalls,
  perOperatorGapPct,
  rankFilials,
  rankOperators,
  ratingDistribution,
  shareOfMax,
  splitSeconds,
} from "./sales.rules";
import {
  leadSourcesSchema,
  leadsFunnelSchema,
  operatorDetailSchema,
  operatorsSchema,
  salesCallsSchema,
  salesFilialsSchema,
  salesFilialsTrendSchema,
  salesRatingsSchema,
  salesSummarySchema,
  type Operator,
  type SalesFilial,
} from "./sales.schema";

type Query = Record<string, string>;

const summaryFor = (query: Query) => parseEnvelope(salesSummarySchema, mockGet("sales/summary/", query)).data;
const operatorsFor = (query: Query) =>
  parseEnvelope(operatorsSchema, mockGet("sales/operators/", query)).data;
const operatorFor = (id: number, query: Query) =>
  parseEnvelope(operatorDetailSchema, mockGet(`sales/operators/${id}/`, query)).data;
const funnelFor = (query: Query) =>
  parseEnvelope(leadsFunnelSchema, mockGet("sales/leads-funnel/", query)).data;
const sourcesFor = (query: Query) =>
  parseEnvelope(leadSourcesSchema, mockGet("sales/lead-sources/", query)).data;
const callsFor = (query: Query) => parseEnvelope(salesCallsSchema, mockGet("sales/calls/", query)).data;
const ratingsFor = (query: Query) => parseEnvelope(salesRatingsSchema, mockGet("sales/ratings/", query)).data;
const filialsFor = (query: Query) => parseEnvelope(salesFilialsSchema, mockGet("sales/filials/", query)).data;
const filialsTrendFor = (query: Query) =>
  parseEnvelope(salesFilialsTrendSchema, mockGet("sales/filials/timeseries/", query)).data;

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

describe("sales contract", () => {
  it.each(SCOPE_CASES)("every sample response matches its schema for %o", (query) => {
    expect(() => {
      summaryFor(query);
      operatorFor(7, query);
      funnelFor(query);
      sourcesFor(query);
      ratingsFor(query);
    }).not.toThrow();
    expect(operatorsFor(query).length).toBeGreaterThan(0);
    expect(callsFor(query).labels.length).toBeGreaterThan(0);
  });

  it.each(SCOPE_CASES)("headline numbers equal the sum of the rows under them for %o", (query) => {
    const summary = summaryFor(query);
    const operators = operatorsFor(query);
    const funnel = sum(funnelFor(query).map((row) => row.count));
    const calls = callTotals(callsFor(query));

    expect(summary.salesAmount.value).toBe(sum(operators.map((row) => row.salesAmount)));
    expect(summary.callsMissedUnhandled.value).toBe(sum(operators.map((row) => row.missedUnhandled)));
    expect(summary.activitiesOverdue.value).toBe(sum(operators.map((row) => row.activitiesOverdue)));
    expect(summary.leads.value).toBe(funnel);
    expect(sum(sourcesFor(query).map((row) => row.leads))).toBe(funnel);
    expect(summary.callsTotal.value).toBe(calls.answered + calls.missed);
  });

  it("matches the approved prototype numbers for the last 30 days", () => {
    const summary = summaryFor({ period: "30d" });

    expect(summary.leads.value).toBe(6240);
    expect(summary.conversion.value).toBe(31);
    expect(summary.callsTotal.value).toBe(14_820);
    expect(summary.callsMissedUnhandled.value).toBe(31);
    expect(callTotals(callsFor({ period: "30d" }))).toMatchObject({ answered: 12_964, missed: 1856 });
  });

  it("returns only the operators of the selected filial", () => {
    const filials = new Set(operatorsFor({ period: "30d", filial: "3" }).map((row) => row.filial));

    expect([...filials]).toEqual(["Samarqand"]);
  });

  it("current-state numbers carry no comparison, and compare=none removes the rest", () => {
    expect(summaryFor({ period: "30d" }).callsMissedUnhandled.deltaPct).toBeNull();
    expect(summaryFor({ period: "30d" }).leads.deltaPct).not.toBeNull();
    expect(summaryFor({ period: "30d", compare: "none" }).leads.deltaPct).toBeNull();
  });

  it("funnel shares add up to the whole", () => {
    const shares = sum(funnelFor({ period: "30d" }).map((row) => row.sharePct));

    expect(shares).toBeCloseTo(100, 0);
  });

  it.each(SCOPE_CASES)(
    "operator card repeats the list row and its daily trend adds up to it for %o",
    (query) => {
      const row = operatorsFor({ ...query, filial: "" }).find((operator) => operator.id === 14);
      const { trend, ...detail } = operatorFor(14, query);

      expect(detail).toEqual(row);
      expect(trend.series).toHaveLength(1);
      expect(sum(trend.series[0]?.values ?? [])).toBe(detail.ordersDelivered);
      expect(trend.series[0]?.values).toHaveLength(trend.labels.length);
    },
  );

  it("answers 404 for an unknown operator", () => {
    expect(() => mockGet("sales/operators/999/", { period: "30d" })).toThrow(/operator_not_found/);
  });

  it("rating count equals the distribution, and low ratings come newest first with a time", () => {
    const ratings = ratingsFor({ period: "30d" });

    expect(ratings.count).toBe(sum(Object.values(ratings.distribution)));
    expect(ratings.low.map((rating) => rating.stars)).toEqual([2, 1]);
    expect(Date.parse(ratings.low[0]?.at ?? "")).toBeGreaterThan(Date.parse(ratings.low[1]?.at ?? ""));
  });
});

describe("sales filials contract", () => {
  it.each(SCOPE_CASES)("lists every filial whatever the filial filter is for %o", (query) => {
    expect(filialsFor(query).map((filial) => filial.name)).toEqual(["Toshkent", "Qo'qon", "Samarqand"]);
    expect(filialsTrendFor(query).series.map((series) => series.key)).toEqual(["1", "2", "3"]);
  });

  it.each(SCOPE_CASES)("each filial row equals the sum of its operators for %o", (query) => {
    const operators = operatorsFor({ ...query, filial: "" });

    for (const filial of filialsFor(query)) {
      const team = operators.filter((row) => row.filial === filial.name);

      expect(filial.operatorsTotal).toBe(team.length);
      expect(filial.operatorsOnline).toBe(team.filter((row) => row.isOnline).length);
      expect(filial.salesAmount.value).toBe(sum(team.map((row) => row.salesAmount)));
      expect(filial.leads).toBe(sum(team.map((row) => row.leads)));
      expect(filial.ordersDelivered).toBe(sum(team.map((row) => row.ordersDelivered)));
      expect(filial.commissionEarned).toBe(sum(team.map((row) => row.commissionEarned)));
      expect(filial.calls).toBe(sum(team.map((row) => row.calls)));
      expect(filial.missedUnhandled).toBe(sum(team.map((row) => row.missedUnhandled)));
      expect(filial.activitiesOverdue).toBe(sum(team.map((row) => row.activitiesOverdue)));
      expect(filial.ratingCount).toBe(sum(team.map((row) => row.ratingCount)));
      expect(filial.salesPerOperator).toBe(Math.round((filial.salesAmount.value ?? 0) / team.length));
    }
  });

  it.each(SCOPE_CASES)("filials add up to the company headline numbers for %o", (query) => {
    const company = summaryFor({ ...query, filial: "" });
    const filials = filialsFor(query);

    expect(sum(filials.map((filial) => filial.salesAmount.value ?? 0))).toBe(company.salesAmount.value ?? 0);
    expect(sum(filials.map((filial) => filial.missedUnhandled))).toBe(company.callsMissedUnhandled.value);
    expect(sum(filials.map((filial) => filial.activitiesOverdue))).toBe(company.activitiesOverdue.value);
  });

  it.each(SCOPE_CASES)("each filial's trend line adds up to its sales for %o", (query) => {
    const trend = filialsTrendFor(query);

    for (const filial of filialsFor(query)) {
      const line = trend.series.find((series) => series.key === String(filial.id));

      expect(line?.values).toHaveLength(trend.labels.length);
      expect(sum(line?.values ?? [])).toBe(filial.salesAmount.value);
    }
  });

  it("carries the team lead, a comparison and the month plan of the delivery channel", () => {
    const [tashkent] = filialsFor({ period: "30d" });

    expect(tashkent?.adminName).toBe("Rustam Abdullayev");
    expect(tashkent?.salesAmount.deltaPct).not.toBeNull();
    expect(filialsFor({ period: "30d", compare: "none" })[0]?.salesAmount.deltaPct).toBeNull();
    expect(tashkent?.plan?.target).toBe(1_100_000_000);
    expect(tashkent?.plan?.pct).toBeCloseTo(((tashkent?.plan?.actual ?? 0) / 1_100_000_000) * 100, 1);
  });

  it("the sample has exactly one team behind the company average per operator", () => {
    const filials = filialsFor({ period: "30d" });
    const average = companySalesPerOperator(filials);
    const lagging = filials.filter((filial) =>
      isLaggingFilial(perOperatorGapPct(filial.salesPerOperator, average)),
    );

    expect(lagging.map((filial) => filial.name)).toEqual(["Samarqand"]);
    expect(perOperatorGapPct(lagging[0]?.salesPerOperator ?? 0, average)).toBe(-17.1);
  });
});

const filial = (id: number, sales: number, operatorsTotal: number): SalesFilial => ({
  id,
  name: `F${id}`,
  adminName: null,
  operatorsTotal,
  operatorsOnline: 0,
  leads: 0,
  conversionPct: 0,
  ordersDelivered: 0,
  salesAmount: { value: sales, previous: null, deltaPct: null, unit: "uzs" },
  salesPerOperator: operatorsTotal > 0 ? sales / operatorsTotal : 0,
  commissionEarned: 0,
  calls: 0,
  missedUnhandled: 0,
  activitiesOverdue: 0,
  ratingAvg: null,
  ratingCount: 0,
  plan: null,
});

describe("filial rules", () => {
  const filials = [filial(1, 300, 2), filial(2, 900, 6), filial(3, 400, 2)];

  it("ranks by sales, best first, without touching the input", () => {
    expect(rankFilials(filials).map((row) => row.id)).toEqual([2, 3, 1]);
    expect(filials.map((row) => row.id)).toEqual([1, 2, 3]);
  });

  it("averages per operator across the company, not across filials", () => {
    // 1600 ÷ 10 operator = 160; filiallar o'rtachasining o'rtachasi (150+150+200)/3 emas
    expect(companySalesPerOperator(filials)).toBe(160);
    expect(companySalesPerOperator([])).toBe(0);
    expect(companySalesPerOperator([filial(1, 500, 0)])).toBe(0);
  });

  it("measures the gap to the company average in percent", () => {
    expect(perOperatorGapPct(200, 160)).toBe(25);
    expect(perOperatorGapPct(140, 160)).toBe(-12.5);
    expect(perOperatorGapPct(150, 0)).toBe(0);
  });

  it("calls a team lagging from 15% below the average", () => {
    expect(isLaggingFilial(-15)).toBe(true);
    expect(isLaggingFilial(-14.9)).toBe(false);
    expect(isLaggingFilial(20)).toBe(false);
  });

  it("words the gap as above, below or level with the average", () => {
    expect(gapDirection(10)).toBe("above");
    expect(gapDirection(-2.8)).toBe("below");
    // butun foizgacha yaxlitlanganda 0 chiqadigan farq — "o'rtacha darajada"
    expect(gapDirection(0.4)).toBe("level");
    expect(gapDirection(-0.4)).toBe("level");
    expect(gapDirection(0)).toBe("level");
  });

  it("ties the colour to the filial itself, so re-ranking never recolours it", () => {
    const ranked = rankFilials(filials);

    expect(filials.map((row) => filialColorIndex(filials, row.id))).toEqual([0, 1, 2]);
    expect(filials.map((row) => filialColorIndex(ranked, row.id))).toEqual([0, 1, 2]);
    expect(filialColorIndex(filials, 99)).toBe(0);
  });
});

const operator = (overrides: Partial<Operator>): Operator => ({
  id: 1,
  fullName: "A",
  filial: "Toshkent",
  isOnline: true,
  leads: 0,
  conversionPct: 0,
  ordersCreated: 0,
  ordersDelivered: 0,
  salesAmount: 0,
  commissionEarned: 0,
  commissionPending: 0,
  calls: 0,
  missedUnhandled: 0,
  activitiesOverdue: 0,
  ratingAvg: null,
  ratingCount: 0,
  ...overrides,
});

describe("operator rules", () => {
  const operators = [
    operator({ id: 1, salesAmount: 50, missedUnhandled: 0 }),
    operator({ id: 2, salesAmount: 200, missedUnhandled: 3 }),
    operator({ id: 3, salesAmount: 120, missedUnhandled: 9 }),
  ];

  it("ranks by sales, best first, without touching the input", () => {
    expect(rankOperators(operators).map((row) => row.id)).toEqual([2, 3, 1]);
    expect(operators.map((row) => row.id)).toEqual([1, 2, 3]);
  });

  it("lists only operators with unhandled missed calls, worst first", () => {
    expect(operatorsWithMissedCalls(operators).map((row) => row.id)).toEqual([3, 2]);
  });

  it("gives the bar width relative to the best value, and nothing when there is no best", () => {
    expect(shareOfMax(50, 200)).toBe(25);
    expect(shareOfMax(50, 0)).toBe(0);
  });
});

describe("lead rules", () => {
  it("colours results by meaning and unknown kinds neutrally", () => {
    expect(leadKindBarClass("success")).toBe("bg-order-delivered");
    expect(leadKindBarClass("fail")).toBe("bg-order-cancelled");
    expect(leadKindBarClass("initial")).not.toBe(leadKindBarClass("intermediate"));
    expect(leadKindBarClass("archived")).toBe("bg-ink-3");
  });

  it("treats 40% and above as a high conversion", () => {
    expect(isHighConversion(40)).toBe(true);
    expect(isHighConversion(39.9)).toBe(false);
  });
});

describe("rating and call rules", () => {
  it("orders the distribution from 5 to 1 stars and fills the gaps with zero", () => {
    expect(ratingDistribution({ "5": 10, "2": 3 })).toEqual([
      { stars: 5, count: 10, isLow: false },
      { stars: 4, count: 0, isLow: false },
      { stars: 3, count: 0, isLow: false },
      { stars: 2, count: 3, isLow: true },
      { stars: 1, count: 0, isLow: true },
    ]);
  });

  it("derives the answer rate from the series and survives an empty period", () => {
    const series = [
      { key: "answered", values: [60, 30] },
      { key: "missed", values: [10, 0] },
    ];

    expect(callTotals({ series })).toEqual({ answered: 90, missed: 10, answerRate: 90 });
    expect(callTotals({ series: [] })).toEqual({ answered: 0, missed: 0, answerRate: 0 });
  });

  it("recognises only the known call series", () => {
    expect(isCallSeries("missed")).toBe(true);
    expect(isCallSeries("voicemail")).toBe(false);
  });

  it("splits seconds into minutes and seconds", () => {
    expect(splitSeconds(142)).toEqual({ minutes: 2, seconds: 22 });
    expect(splitSeconds(-5)).toEqual({ minutes: 0, seconds: 0 });
  });
});
