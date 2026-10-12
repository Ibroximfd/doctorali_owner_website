import { describe, expect, it } from "vitest";

import { parseEnvelope } from "@/shared/lib/envelope";
import { sample } from "@/shared/testing/fixtures/sample";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import { doctorSubtitle, rankDoctors } from "./doctors.rules";
import { doctorsSchema, doctorsSummarySchema, type Doctor } from "./doctors.schema";

type Query = Record<string, string>;

const summaryFor = (query: Query) =>
  parseEnvelope(doctorsSummarySchema, mockGet("doctors/summary/", query)).data;
const doctorsFor = (query: Query) => parseEnvelope(doctorsSchema, mockGet("doctors/", query)).data;

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

describe("doctors contract", () => {
  it.each(SCOPE_CASES)("every sample response matches its schema for %o", (query) => {
    expect(() => {
      summaryFor(query);
      doctorsFor(query);
    }).not.toThrow();
  });

  it.each(SCOPE_CASES)("ranking rows add up to the summary for %o", (query) => {
    const summary = summaryFor(query);
    const doctors = doctorsFor(query);

    expect(sum(doctors.map((doctor) => doctor.onlineConsultations))).toBe(summary.onlineConsultations.value);
    expect(sum(doctors.map((doctor) => doctor.salesAmount))).toBe(summary.salesAmount.value);
    expect(sum(doctors.map((doctor) => doctor.payoutOutstanding))).toBe(summary.payoutOutstanding);
  });

  it("keeps the prototype numbers for the whole business over 30 days", () => {
    const summary = summaryFor({ period: "30d" });

    expect(summary.activeDoctors.value).toBe(sample.doctorsSummary.active);
    expect(summary.onlineConsultations.value).toBe(sample.doctorsSummary.onlineConsultations);
    expect(summary.payoutOutstanding).toBe(Math.round(sample.doctorsSummary.payoutOutstanding));
    expect(summary.doctorsWaiting).toBe(sample.liabilities.doctorsWaiting);
  });

  it("outstanding commission is a current state, sales follow the period", () => {
    const [week, month] = [summaryFor({ period: "7d" }), summaryFor({ period: "30d" })];

    expect(week.payoutOutstanding).toBe(month.payoutOutstanding);
    expect(week.salesAmount.value ?? 0).toBeLessThan(month.salesAmount.value ?? 0);
  });

  it("has no comparison numbers when compare is none", () => {
    expect(summaryFor({ period: "30d", compare: "none" }).salesAmount.deltaPct).toBeNull();
  });

  it("returns doctors of the selected filials, best seller first", () => {
    const all = doctorsFor({ period: "30d" });
    const kokand = doctorsFor({ period: "30d", filial: "2" });

    expect(all).toHaveLength(sample.doctors.length);
    expect(all.map((doctor) => doctor.salesAmount)).toEqual(
      [...all.map((doctor) => doctor.salesAmount)].sort((first, second) => second - first),
    );
    expect(kokand.map((doctor) => doctor.fullName)).toEqual(["Sherzod Qosimov", "Javlon Hamidov"]);
  });

  it("a filial without doctors gets an empty ranking and a zero summary", () => {
    const query = { period: "30d", filial: "3" };

    expect(doctorsFor(query)).toEqual([]);
    expect(summaryFor(query)).toMatchObject({
      payoutOutstanding: 0,
      doctorsWaiting: 0,
      activeDoctors: { value: 0 },
    });
  });
});

describe("rankDoctors", () => {
  const doctor = (id: number, salesAmount: number): Doctor => ({
    id,
    fullName: `Doctor ${id}`,
    specialty: "Terapevt",
    filial: "Toshkent",
    onlineConsultations: 0,
    clinicVisits: 0,
    ordersCreated: 0,
    salesAmount,
    commissionEarned: 0,
    payoutOutstanding: 0,
    ratingAvg: 4.5,
    ratingCount: 10,
  });

  it("orders by sales and measures everyone against the leader", () => {
    const source = [doctor(1, 50), doctor(2, 200), doctor(3, 100)];
    const ranked = rankDoctors(source);

    expect(ranked.map((row) => [row.id, row.rank, row.salesShare])).toEqual([
      [2, 1, 100],
      [3, 2, 50],
      [1, 3, 25],
    ]);
    expect(source.map((row) => row.id)).toEqual([1, 2, 3]);
  });

  it("does not divide by zero when nobody sold anything", () => {
    expect(rankDoctors([doctor(1, 0)])[0]?.salesShare).toBe(0);
    expect(rankDoctors([])).toEqual([]);
  });
});

describe("doctorSubtitle", () => {
  it("joins the specialty with the filial when there is one", () => {
    expect(doctorSubtitle({ specialty: "Nevrolog", filial: "Toshkent" })).toBe("Nevrolog · Toshkent");
    expect(doctorSubtitle({ specialty: "Nevrolog", filial: null })).toBe("Nevrolog");
  });
});
