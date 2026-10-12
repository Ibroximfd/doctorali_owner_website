import { describe, expect, it } from "vitest";

import { parseEnvelope, timeseriesSchema } from "@/shared/lib/envelope";
import { sample } from "@/shared/testing/fixtures/sample";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import {
  clinicAvailability,
  clinicsInScope,
  closingState,
  isRevenueMixKey,
  topDoctors,
} from "./clinic.rules";
import {
  clinicBranchesSchema,
  clinicDoctorsSchema,
  clinicSummarySchema,
  clinicWarehouseSchema,
  type ClinicDoctor,
} from "./clinic.schema";

type Query = Record<string, string>;

const summaryFor = (query: Query) =>
  parseEnvelope(clinicSummarySchema, mockGet("clinic/summary/", query)).data;
const mixSeriesFor = (query: Query) =>
  parseEnvelope(timeseriesSchema, mockGet("clinic/timeseries/", query)).data;
const branchesFor = (query: Query) =>
  parseEnvelope(clinicBranchesSchema, mockGet("clinic/branches/", query)).data;
const doctorsFor = (query: Query) =>
  parseEnvelope(clinicDoctorsSchema, mockGet("clinic/doctors/", query)).data;
const warehouseFor = (query: Query) =>
  parseEnvelope(clinicWarehouseSchema, mockGet("clinic/warehouse/", query)).data;

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

describe("clinic contract", () => {
  it.each(SCOPE_CASES)("every sample response matches its schema for %o", (query) => {
    expect(() => {
      summaryFor(query);
      mixSeriesFor(query);
      branchesFor(query);
      doctorsFor(query);
      warehouseFor(query);
    }).not.toThrow();
  });

  it.each(SCOPE_CASES)("revenue mix adds up to clinic revenue for %o", (query) => {
    const { revenue, revenueMix } = summaryFor(query);

    expect(revenueMix.products + revenueMix.treatments + revenueMix.consultations).toBe(revenue.value);
  });

  it("clinic revenue of the whole business is the clinic channel, scaled by the period", () => {
    expect(summaryFor({ period: "30d" }).revenue.value).toBe(sample.revenue.clinic);
    expect(summaryFor({ period: "7d" }).revenue.value).toBe(Math.round((sample.revenue.clinic * 7) / 30));
  });

  it("keeps the prototype numbers for the last 30 days", () => {
    const summary = summaryFor({ period: "30d" });

    expect(summary.revenueMix).toEqual(sample.clinic.mix);
    expect(summary.visits).toEqual(sample.clinic.visits);
    expect(summary.noShowRate?.value).toBe(9.3);
    expect(summary.treatments.value).toBe(894);
    expect(summary.consultations.value).toBe(612);
    expect(summary.newClients.value).toBe(sample.clinic.newClients);
    expect(summary.returningClients.value).toBe(sample.clinic.returningClients);
  });

  it.each(SCOPE_CASES)("visit outcomes add up to scheduled visits, clients to arrivals for %o", (query) => {
    const { visits, visitsArrived, newClients, returningClients } = summaryFor(query);

    expect(visits.arrived + visits.noShow + visits.cancelled).toBe(visits.scheduled);
    expect(visitsArrived.value).toBe(visits.arrived);
    expect((newClients.value ?? 0) + (returningClients.value ?? 0)).toBe(visits.arrived);
  });

  it("has no comparison numbers when compare is none", () => {
    const { revenue, noShowRate } = summaryFor({ period: "30d", compare: "none" });

    expect(revenue.previous).toBeNull();
    expect(noShowRate?.deltaPct).toBeNull();
  });

  it("revenue timeseries has one value per label and follows the revenue mix", () => {
    const query = { period: "7d" };
    const { labels, series } = mixSeriesFor(query);
    const { revenueMix } = summaryFor(query);

    expect(labels).toHaveLength(7);
    expect(series.map((item) => item.key)).toEqual(["products", "treatments", "consultations"]);
    for (const item of series) expect(item.values).toHaveLength(7);
    // har nuqta alohida yaxlitlanadi — yig'indi jami bilan nuqtalar sonidan ortiq farq qilmaydi
    expect(Math.abs(sum(series[0]?.values ?? []) - revenueMix.products)).toBeLessThanOrEqual(labels.length);
  });
});

describe("clinic branches", () => {
  it("branch rows add up to the all-filials totals", () => {
    const summary = summaryFor({ period: "30d" });
    const branches = branchesFor({ period: "30d" });

    expect(branches.map((branch) => branch.name)).toEqual(["Toshkent", "Qo'qon"]);
    expect(sum(branches.map((branch) => branch.revenue ?? 0))).toBe(summary.revenue.value);
    expect(sum(branches.map((branch) => branch.visitsArrived ?? 0))).toBe(summary.visitsArrived.value);
    expect(sum(branches.map((branch) => branch.stockValue ?? 0))).toBe(warehouseFor({}).stockValue);
  });

  it("no-show rates are the ones the prototype shows per branch", () => {
    const rates = branchesFor({ period: "30d" }).map((branch) => branch.noShowRate);

    expect(rates).toEqual(sample.clinic.branches.map((branch) => branch.noShowRate));
  });

  it.each(["1", "2"])(
    "a single clinic filial (%s) shows exactly its own branch row in the summary",
    (filial) => {
      const query = { period: "30d", filial };
      const summary = summaryFor(query);
      const [branch, ...others] = branchesFor(query);

      expect(others).toHaveLength(0);
      expect(summary.revenue.value).toBe(branch?.revenue);
      expect(summary.visitsArrived.value).toBe(branch?.visitsArrived);
      expect(summary.noShowRate?.value).toBe(branch?.noShowRate);
    },
  );

  it("a filial without a clinic has no branches and zero numbers", () => {
    const query = { period: "30d", filial: "3" };
    const summary = summaryFor(query);

    expect(branchesFor(query)).toEqual([]);
    expect(doctorsFor(query)).toEqual([]);
    expect(summary.revenue.value).toBe(0);
    expect(summary.visits.scheduled).toBe(0);
    expect(warehouseFor({ filial: "3" })).toMatchObject({
      stockValue: 0,
      skuCount: 0,
      low: [],
      out: [],
      lastCount: null,
    });
  });

  it("warehouse lists only the selected filial's products", () => {
    const warehouse = warehouseFor({ filial: "2" });

    expect(warehouse.out.map((item) => item.filial)).toEqual(["Qo'qon"]);
    expect(new Set(warehouse.low.map((item) => item.filial))).toEqual(new Set(["Qo'qon"]));
  });

  it("doctors belong to the selected filial and scale with the period", () => {
    const month = doctorsFor({ period: "30d", filial: "2" });
    const week = doctorsFor({ period: "7d", filial: "2" });

    expect(month.map((doctor) => doctor.filial)).toEqual(["Qo'qon", "Qo'qon"]);
    expect(week[0]?.salesRevenue).toBeLessThan(month[0]?.salesRevenue ?? 0);
    // to'lanmagan summa — hozirgi holat, davrga bog'liq emas
    expect(week[0]?.payoutOutstanding).toBe(month[0]?.payoutOutstanding);
  });
});

describe("clinicAvailability", () => {
  const filials = [
    { id: 1, hasClinic: true },
    { id: 2, hasClinic: true },
    { id: 3, hasClinic: false },
  ];

  it("all filials are always available", () => {
    expect(clinicAvailability([], undefined)).toBe("available");
  });

  it("is unknown until the filial dictionary arrives", () => {
    expect(clinicAvailability([3], undefined)).toBe("unknown");
  });

  it("is unavailable when none of the selected filials has a clinic", () => {
    expect(clinicAvailability([3], filials)).toBe("unavailable");
    expect(clinicAvailability([1, 3], filials)).toBe("available");
  });

  it("lists only the clinics inside the selection", () => {
    expect(clinicsInScope([], filials).map((filial) => filial.id)).toEqual([1, 2]);
    expect(clinicsInScope([2, 3], filials).map((filial) => filial.id)).toEqual([2]);
  });
});

describe("closingState", () => {
  it("a closed till is judged by its difference", () => {
    expect(closingState("closed", 0)).toBe("balanced");
    expect(closingState("closed", -180_000)).toBe("shortage");
    expect(closingState("closed", 20_000)).toBe("surplus");
  });

  it("keeps open and reopened tills apart and does not guess an unknown status", () => {
    expect(closingState("open", 0)).toBe("open");
    expect(closingState("reopened", 20_000)).toBe("reopened");
    expect(closingState("archived", 0)).toBe("unknown");
  });
});

describe("clinic helpers", () => {
  const doctor = (name: string, salesRevenue: number): ClinicDoctor => ({
    doctor: name,
    specialty: "Terapevt",
    filial: "Toshkent",
    visits: 10,
    treatmentsRevenue: 0,
    salesRevenue,
    commissionEarned: 0,
    payoutOutstanding: 0,
  });

  it("topDoctors ranks by sales and keeps the source untouched", () => {
    const doctors = [doctor("A", 10), doctor("B", 30), doctor("C", 20)];

    expect(topDoctors(doctors, 2).map((row) => row.doctor)).toEqual(["B", "C"]);
    expect(doctors.map((row) => row.doctor)).toEqual(["A", "B", "C"]);
  });

  it("only the known revenue parts get a fixed colour and a translated name", () => {
    expect(isRevenueMixKey("treatments")).toBe(true);
    expect(isRevenueMixKey("something_new")).toBe(false);
  });
});
