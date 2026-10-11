import { describe, expect, it } from "vitest";

import { parseEnvelope, timeseriesSchema } from "@/shared/lib/envelope";
import { sample } from "@/shared/mocks/sample";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import {
  codLevel,
  dailySeries,
  isAttemptReason,
  isTransferStatus,
  regionName,
  unsettledDays,
} from "./logistics.rules";
import {
  attemptReasonsSchema,
  courierDetailSchema,
  couriersSchema,
  logisticsSummarySchema,
  regionDeliverySchema,
  transfersSchema,
} from "./logistics.schema";

type Query = Record<string, string>;

const summaryFor = (query: Query) =>
  parseEnvelope(logisticsSummarySchema, mockGet("logistics/summary/", query)).data;
const couriersFor = (query: Query) => parseEnvelope(couriersSchema, mockGet("logistics/couriers/", query));
const courierFor = (id: number, query: Query) =>
  parseEnvelope(courierDetailSchema, mockGet(`logistics/couriers/${id}/`, query)).data;
const timeseriesFor = (query: Query) =>
  parseEnvelope(timeseriesSchema, mockGet("logistics/timeseries/", query)).data;
const regionsFor = (query: Query) =>
  parseEnvelope(regionDeliverySchema, mockGet("logistics/regions/", query)).data;
const reasonsFor = (query: Query) =>
  parseEnvelope(attemptReasonsSchema, mockGet("logistics/attempt-reasons/", query)).data;
const transfersFor = (query: Query) =>
  parseEnvelope(transfersSchema, mockGet("logistics/transfers/", query)).data;

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

describe("logistics contract", () => {
  it.each(SCOPE_CASES)("every sample response matches its schema for %o", (query) => {
    expect(() => {
      summaryFor(query);
      couriersFor(query);
      courierFor(1, query);
      timeseriesFor(query);
      regionsFor(query);
      reasonsFor(query);
      transfersFor(query);
    }).not.toThrow();
  });

  it.each(SCOPE_CASES)("courier rows add up to the summary for %o", (query) => {
    const summary = summaryFor(query);
    const couriers = couriersFor(query).data;

    expect(sum(couriers.map((courier) => courier.delivered))).toBe(summary.delivered.value);
    expect(sum(couriers.map((courier) => courier.attempts))).toBe(summary.attempts.value);
    expect(sum(couriers.map((courier) => courier.codUnsettled))).toBe(summary.codUnsettled);
    expect(couriers.filter((courier) => courier.codUnsettled > 0)).toHaveLength(summary.codUnsettledCouriers);
  });

  it.each(SCOPE_CASES)("attempt reasons add up to the attempts in the summary for %o", (query) => {
    const reasons = reasonsFor(query);

    expect(sum(reasons.map((item) => item.count))).toBe(summaryFor(query).attempts.value);
    expect(reasons.every((item) => item.count >= 0)).toBe(true);
  });

  it("keeps the prototype numbers for the whole business over 30 days", () => {
    const summary = summaryFor({ period: "30d" });

    expect(summary.delivered.value).toBe(sample.kpi.delivered);
    expect(summary.successRate?.value).toBe(88.6);
    expect(summary.avgDeliveryMinutes?.value).toBe(1290);
    expect(summary.attempts.value).toBe(sum(sample.attemptReasons.map((item) => item.count)));
    expect(summary.codUnsettled).toBe(Math.round(sample.cash.courierCod));
    expect(summary).toMatchObject({ inTransitNow: 246, lateNow: 21, codUnsettledCouriers: 6 });
  });

  it("what is on the road and unsettled right now does not depend on the period", () => {
    const [week, month] = [summaryFor({ period: "7d" }), summaryFor({ period: "30d" })];

    expect(week.inTransitNow).toBe(month.inTransitNow);
    expect(week.codUnsettled).toBe(month.codUnsettled);
    expect(week.delivered.value ?? 0).toBeLessThan(month.delivered.value ?? 0);
  });

  it("has no comparison numbers when compare is none", () => {
    const { delivered, successRate } = summaryFor({ period: "30d", compare: "none" });

    expect(delivered.previous).toBeNull();
    expect(successRate?.deltaPct).toBeNull();
  });

  it("lists only the couriers of the selected filials", () => {
    const couriers = couriersFor({ period: "30d", filial: "3" }).data;

    expect(couriers.map((courier) => courier.fullName)).toEqual(["Nodir Xolmatov", "Alisher Mamatov"]);
  });

  it("a single courier repeats its table row and adds a daily series", () => {
    const query = { period: "7d" };
    const row = couriersFor(query).data.find((courier) => courier.id === 9);
    const { timeseries, ...detail } = courierFor(9, query);

    expect(detail).toEqual(row);
    expect(timeseries.labels).toHaveLength(7);
    expect(timeseries.series.map((series) => series.key)).toEqual(["delivered"]);
    expect(timeseries.series[0]?.values).toHaveLength(7);
  });

  it("answers 404 for an unknown courier", () => {
    expect(() => mockGet("logistics/couriers/999/")).toThrow(/404.*courier_not_found/);
  });

  it("daily series have one value per label and follow the summary", () => {
    const query = { period: "30d" };
    const { labels, series } = timeseriesFor(query);
    const delivered = series.find((item) => item.key === "delivered")?.values ?? [];

    expect(series.map((item) => item.key)).toEqual(["delivered", "cancelled", "attempts"]);
    for (const item of series) expect(item.values).toHaveLength(labels.length);
    // har nuqta alohida yaxlitlanadi — yig'indi jami bilan nuqtalar sonidan ortiq farq qilmaydi
    expect(Math.abs(sum(delivered) - (summaryFor(query).delivered.value ?? 0))).toBeLessThanOrEqual(
      labels.length,
    );
  });

  it("region delivery time is the same for any period, order counts scale", () => {
    const [week, month] = [regionsFor({ period: "7d" }), regionsFor({ period: "30d" })];

    expect(week.map((region) => region.avgMinutes)).toEqual(month.map((region) => region.avgMinutes));
    expect(week[0]?.orders).toBeLessThan(month[0]?.orders ?? 0);
  });

  it("shows only the transfers that touch the selected filial", () => {
    expect(transfersFor({ period: "30d" }).results.map((transfer) => transfer.number)).toEqual([
      "TR-0412",
      "TR-0411",
      "TR-0409",
    ]);
    expect(transfersFor({ period: "30d", filial: "3" })).toMatchObject({
      count: 1,
      results: [{ number: "TR-0411", toFilial: "Samarqand" }],
    });
  });
});

describe("unsettledDays", () => {
  const now = "2026-10-02T09:05:00Z";

  it("counts whole days since the oldest unsettled cash", () => {
    expect(unsettledDays("2026-10-02T06:05:00Z", now)).toBe(0);
    expect(unsettledDays("2026-10-01T06:05:00Z", now)).toBe(1);
    expect(unsettledDays("2026-09-30T06:05:00Z", now)).toBe(2);
  });

  it("is null when nothing is unsettled and never negative", () => {
    expect(unsettledDays(null, now)).toBeNull();
    expect(unsettledDays("2026-10-03T00:00:00Z", now)).toBe(0);
  });
});

describe("codLevel", () => {
  it("grades the sample couriers the way the prototype marks them", () => {
    const { data, generatedAt } = couriersFor({ period: "30d" });
    const levelOf = (name: string) => {
      const courier = data.find((item) => item.fullName === name);
      return courier ? codLevel(courier, generatedAt) : undefined;
    };

    expect(levelOf("Otabek Yusupov")).toBe("overdue");
    expect(levelOf("Alisher Mamatov")).toBe("yesterday");
    expect(levelOf("Jasur Karimov")).toBe("today");
    expect(levelOf("Farrux Aliyev")).toBe("none");
  });

  it("ignores an old date when the cash has already been handed over", () => {
    expect(
      codLevel({ codUnsettled: 0, oldestUnsettledAt: "2026-09-01T00:00:00Z" }, "2026-10-02T09:05:00Z"),
    ).toBe("none");
  });
});

describe("logistics helpers", () => {
  it("dailySeries keeps delivered and cancelled, in that order, and drops the rest", () => {
    const series = dailySeries({
      labels: ["2026-10-01"],
      series: [
        { key: "attempts", values: [3] },
        { key: "cancelled", values: [2] },
        { key: "delivered", values: [9] },
      ],
    });

    expect(series).toEqual([
      { key: "delivered", values: [9] },
      { key: "cancelled", values: [2] },
    ]);
  });

  it("knows the translated attempt reasons and transfer statuses", () => {
    expect(sample.attemptReasons.every((item) => isAttemptReason(item.reason))).toBe(true);
    expect(isAttemptReason("weather")).toBe(false);
    expect(sample.transfers.every((transfer) => isTransferStatus(transfer.status))).toBe(true);
    expect(isTransferStatus("lost")).toBe(false);
  });

  it("regionName falls back to the code", () => {
    const regions = [{ code: "samarqand", name: "Samarqand" }];

    expect(regionName("samarqand", regions)).toBe("Samarqand");
    expect(regionName("new_region", regions)).toBe("new_region");
    expect(regionName("samarqand", undefined)).toBe("samarqand");
  });
});
