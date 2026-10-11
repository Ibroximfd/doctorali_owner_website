import { describe, expect, it } from "vitest";

import { parseEnvelope, timeseriesSchema } from "@/shared/lib/envelope";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import {
  cancelFunnelSteps,
  confirmFunnelSteps,
  isEngagementEmpty,
  languageLabelKey,
  marketLabelKey,
  platformLabelKey,
  retainedOrders,
  seriesValues,
  shareOf,
  totalPlatformUsers,
} from "./mobile-app.rules";
import {
  APP_TIMESERIES_METRICS,
  appConsultationsSchema,
  appDevicesSchema,
  appEngagementSchema,
  appFunnelsSchema,
  appLoyaltySchema,
  appSummarySchema,
  doctorAppSchema,
} from "./mobile-app.schema";

type Query = Record<string, string>;

const summaryFor = (query: Query) => parseEnvelope(appSummarySchema, mockGet("app/summary/", query)).data;
const devicesFor = (query: Query) => parseEnvelope(appDevicesSchema, mockGet("app/devices/", query)).data;
const consultationsFor = (query: Query) =>
  parseEnvelope(appConsultationsSchema, mockGet("app/consultations/", query)).data;
const funnelsFor = (query: Query) =>
  parseEnvelope(appFunnelsSchema, mockGet("orders/app-funnels/", query)).data;
const timeseriesFor = (query: Query) =>
  parseEnvelope(timeseriesSchema, mockGet("app/timeseries/", query)).data;

const isNonIncreasing = (counts: readonly number[]): boolean =>
  counts.every((count, index) => index === 0 || count <= (counts[index - 1] ?? 0));

describe("mobile app contract", () => {
  it.each(SCOPE_CASES)("every sample response matches its schema for %o", (query) => {
    expect(() => summaryFor(query)).not.toThrow();
    expect(() => devicesFor(query)).not.toThrow();
    expect(() => consultationsFor(query)).not.toThrow();
    expect(() => funnelsFor(query)).not.toThrow();
    expect(() => parseEnvelope(appEngagementSchema, mockGet("app/engagement/", query))).not.toThrow();
    expect(() => parseEnvelope(appLoyaltySchema, mockGet("app/loyalty/", query))).not.toThrow();
    expect(() => parseEnvelope(doctorAppSchema, mockGet("app/doctor-app/", query))).not.toThrow();
  });

  it.each(SCOPE_CASES)("each timeseries metric comes alone, one value per label, for %o", (query) => {
    for (const metric of APP_TIMESERIES_METRICS) {
      const { labels, series } = timeseriesFor({ ...query, metric });

      expect(series.map((item) => item.key)).toEqual([metric]);
      expect(series[0]?.values).toHaveLength(labels.length);
    }
  });

  it("rejects an unknown timeseries metric instead of guessing", () => {
    expect(() => mockGet("app/timeseries/", { period: "30d", metric: "revenue" })).toThrow(/invalid_metric/);
  });

  it.each(SCOPE_CASES)("platform users add up to the total user base for %o", (query) => {
    const devices = devicesFor(query);

    expect(totalPlatformUsers(devices)).toBe(summaryFor(query).usersTotal.value);
    expect(devices.platform.reduce((sum, row) => sum + row.sharePct, 0)).toBeCloseTo(100, 1);
  });

  it.each(SCOPE_CASES)("funnel steps never grow from one step to the next for %o", (query) => {
    const { confirm, cancel } = funnelsFor(query);

    expect(isNonIncreasing(confirmFunnelSteps(confirm).map((step) => step.count))).toBe(true);
    expect(isNonIncreasing(cancelFunnelSteps(cancel).map((step) => step.count))).toBe(true);
    expect(cancel.step2Kept).toBeGreaterThanOrEqual(0);
  });

  it.each(SCOPE_CASES)("the consultations KPI equals the consultations card for %o", (query) => {
    const consultations = consultationsFor(query);

    expect(summaryFor(query).consultations.value).toBe(consultations.created);
    expect(consultations.paid).toBeLessThanOrEqual(consultations.created);
    expect(consultations.completed).toBeLessThanOrEqual(consultations.paid);
  });

  it("scales period flows but keeps the user base and device split as they are now", () => {
    const [week, month] = [summaryFor({ period: "7d" }), summaryFor({ period: "30d" })];

    expect(week.newUsers.value ?? 0).toBeLessThan(month.newUsers.value ?? 0);
    expect(week.usersTotal.value).toBe(month.usersTotal.value);
    expect(devicesFor({ period: "7d" })).toEqual(devicesFor({ period: "30d" }));
  });

  it("new users over time add up to the KPI (within rounding of each bucket)", () => {
    const { labels } = timeseriesFor({ period: "30d", metric: "new_users" });
    const total = seriesValues(timeseriesFor({ period: "30d", metric: "new_users" }), "new_users").reduce(
      (sum, value) => sum + value,
      0,
    );

    expect(Math.abs(total - (summaryFor({ period: "30d" }).newUsers.value ?? 0))).toBeLessThanOrEqual(
      labels.length / 2,
    );
  });

  it("app metrics are not tied to a filial, order funnels are", () => {
    expect(summaryFor({ period: "30d", filial: "3" }).newUsers.value).toBe(
      summaryFor({ period: "30d" }).newUsers.value,
    );
    expect(funnelsFor({ period: "30d", filial: "3" }).confirm.pushSent).toBeLessThan(
      funnelsFor({ period: "30d" }).confirm.pushSent,
    );
  });

  it("has no comparison numbers when compare is none", () => {
    const summary = summaryFor({ period: "30d", compare: "none" });
    const engagement = parseEnvelope(
      appEngagementSchema,
      mockGet("app/engagement/", { period: "30d", compare: "none" }),
    ).data;

    expect(summary.newUsers.previous).toBeNull();
    expect(summary.pushEnabledRate.deltaPct).toBeNull();
    expect(engagement.streamViewers?.deltaPct).toBeNull();
  });
});

describe("schema tolerance", () => {
  const envelopeOf = (data: unknown) => ({
    ...(mockGet("app/engagement/", { period: "30d" }) as object),
    data,
  });

  it("treats a missing or null engagement metric as 'no data', not a contract break", () => {
    const engagement = parseEnvelope(appEngagementSchema, envelopeOf({ referrals: null })).data;

    expect(engagement.referrals).toBeNull();
    expect(engagement.foodScans).toBeNull();
    expect(isEngagementEmpty(engagement)).toBe(true);
  });

  it("works without the fields added on top of the contract", () => {
    const { data: summary } = mockGet("app/summary/", { period: "30d" }) as { data: Record<string, unknown> };
    const { avg_daily_active_users: _average, sparklines: _sparklines, ...contractOnly } = summary;
    const parsed = parseEnvelope(appSummarySchema, envelopeOf(contractOnly)).data;

    expect(parsed.avgDailyActiveUsers).toBeNull();
    expect(parsed.sparklines).toEqual({});
  });

  it("rejects a summary whose metric is not a metric", () => {
    expect(() => parseEnvelope(appSummarySchema, envelopeOf({ users_total: 86_400 }))).toThrow();
  });
});

describe("cancel funnel", () => {
  const cancel = { step1: 214, step2Kept: 96, step2Continued: 91, step3Cancelled: 58 };

  it("rebuilds the four visible steps from the contract's kept/continued split", () => {
    expect(cancelFunnelSteps(cancel).map((step) => step.count)).toEqual([214, 187, 91, 58]);
  });

  it("counts everyone who started cancelling but did not finish as retained", () => {
    expect(retainedOrders(cancel)).toEqual({ count: 156, pct: 72.9 });
  });

  it("reports nothing retained when nobody started cancelling", () => {
    expect(retainedOrders({ step1: 0, step2Kept: 0, step2Continued: 0, step3Cancelled: 0 })).toEqual({
      count: 0,
      pct: 0,
    });
  });
});

describe("helpers", () => {
  it("shareOf rounds to one decimal and survives a zero denominator", () => {
    expect(shareOf(1024, 1286)).toBe(79.6);
    expect(shareOf(5, 0)).toBe(0);
  });

  it("picks only the requested series, even if the server sends several", () => {
    const timeseries = {
      labels: ["a", "b"],
      series: [
        { key: "new_users", values: [1, 2] },
        { key: "active_users", values: [30, 40] },
      ],
    };

    expect(seriesValues(timeseries, "active_users")).toEqual([30, 40]);
    expect(seriesValues({ labels: ["a"], series: [] }, "active_users")).toEqual([]);
  });

  it("maps known wire keys to translation keys and leaves unknown ones to the UI", () => {
    expect(platformLabelKey("iOS")).toBe("ios");
    expect(languageLabelKey("uz-Cyrl")).toBe("uzCyrl");
    expect(marketLabelKey("intl")).toBe("intl");
    expect(platformLabelKey("harmonyos")).toBeNull();
    expect(languageLabelKey("kk")).toBeNull();
    expect(marketLabelKey("KZ")).toBeNull();
  });
});
