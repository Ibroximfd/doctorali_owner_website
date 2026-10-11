import { addDays } from "@/shared/lib/scope";

import { envelope, sparkline, type MockContext } from "../engine";
import { sample } from "../sample";
import type { MockHandler } from "../types";

const { clinic } = sample;

type Branch = (typeof clinic.branches)[number];

/**
 * Filial bo'yicha kelmagan va bekor qilingan tashriflar (30 kun). Yig'indisi
 * `sample.clinic.visits` ga teng, ulushi esa filial qatoridagi "kelmagan"
 * foiziga mos (8,4% / 10,9%) — KPI va filiallar jadvali bir xil raqam ko'rsatadi.
 */
const BRANCH_MISSED: Record<number, { noShow: number; cancelled: number }> = {
  1: { noShow: 134, cancelled: 66 },
  2: { noShow: 98, cancelled: 48 },
};

/** Nomenklatura qo'shilmaydi: bir nechta filial tanlansa eng kattasi ko'rsatiladi. */
const BRANCH_SKU_COUNT: Record<number, number> = { 1: clinic.warehouse.skuCount, 2: 118 };

/** Namuna: shifokor qabuliga to'g'ri keladigan o'rtacha muolaja tushumi. */
const TREATMENT_REVENUE_PER_VISIT = 62_000;

const LAST_COUNT = { daysAgo: 12, shortage: 320_000, surplus: 0 };

const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

const sumOf = <Item>(items: readonly Item[], pick: (item: Item) => number): number =>
  items.reduce((sum, item) => sum + pick(item), 0);

const missedOf = (branch: Branch): { noShow: number; cancelled: number } =>
  BRANCH_MISSED[branch.filialId] ?? { noShow: 0, cancelled: 0 };

/** Tanlangan filiallardagi klinikalar. Samarqandda klinika yo'q — u tanlansa ro'yxat bo'sh. */
const branchesInScope = (ctx: MockContext): Branch[] =>
  clinic.branches.filter((branch) => ctx.filials.some((filial) => filial.id === branch.filialId));

/** Tanlangan klinikalarning 30 kunlik asosi (davrga masshtablanmagan). */
const scopeBase = (ctx: MockContext) => {
  const branches = branchesInScope(ctx);
  const arrived = sumOf(branches, (branch) => branch.visits);
  const noShow = sumOf(branches, (branch) => missedOf(branch).noShow);
  const cancelled = sumOf(branches, (branch) => missedOf(branch).cancelled);

  return {
    branches,
    revenue: sumOf(branches, (branch) => branch.revenue),
    arrived,
    noShow,
    cancelled,
    scheduled: arrived + noShow + cancelled,
  };
};

/**
 * Tushum tarkibi: tanlangan klinikalarning klinika tushumidagi ulushi bo'yicha
 * (prototipdagi `sh`). Oxirgi bo'lak qoldiq — yig'indi aynan klinika tushumiga teng.
 */
const revenueMix = (ctx: MockContext, baseRevenue: number) => {
  const scale = (baseRevenue / sample.revenue.clinic) * ctx.period.scale;
  const revenue = Math.round(baseRevenue * ctx.period.scale);
  const products = Math.round(clinic.mix.products * scale);
  const treatments = Math.round(clinic.mix.treatments * scale);

  return { revenue, products, treatments, consultations: revenue - products - treatments };
};

const purposeCount = (key: string): number =>
  clinic.purposes.find((purpose) => purpose.key === key)?.count ?? 0;

const summary = (ctx: MockContext) => {
  const base = scopeBase(ctx);
  const mix = revenueMix(ctx, base.revenue);
  const scaled = (value: number) => Math.round(value * ctx.period.scale);
  const arrived = scaled(base.arrived);
  const noShow = scaled(base.noShow);
  const cancelled = scaled(base.cancelled);
  // Tashrifga bog'liq sonlar (maqsad, yangi/qaytgan mijoz) kelganlar ulushi bo'yicha taqsimlanadi.
  const byVisits = (value: number) => Math.round((value * arrived) / clinic.visits.arrived);
  const newClients = byVisits(clinic.newClients);

  return envelope(ctx, {
    revenue: ctx.metric(mix.revenue, 7.8, "uzs"),
    visits_arrived: ctx.metric(arrived, 5.1, "count"),
    no_show_rate: ctx.metric(pct(base.noShow, base.scheduled), -0.9, "pct"),
    treatments: ctx.metric(byVisits(purposeCount("treatment")), 6.2, "count"),
    consultations: ctx.metric(byVisits(purposeCount("consultation")), 3.3, "count"),
    avg_check: ctx.metric(base.branches.length > 0 ? clinic.avgCheck : 0, 2.6, "uzs"),
    new_clients: ctx.metric(newClients, -3.4, "count"),
    returning_clients: ctx.metric(arrived - newClients, 4.1, "count"),
    revenue_mix: { products: mix.products, treatments: mix.treatments, consultations: mix.consultations },
    visits: { scheduled: arrived + noShow + cancelled, arrived, no_show: noShow, cancelled },
    visit_purposes: clinic.purposes.map((purpose) => ({ key: purpose.key, count: byVisits(purpose.count) })),
    sparklines: {
      revenue: sparkline(61),
      visits_arrived: sparkline(62),
      no_show_rate: sparkline(63, -0.15),
      treatments: sparkline(64),
      consultations: sparkline(65, 0.1),
      avg_check: sparkline(66, 0.1),
    },
  });
};

const timeseries = (ctx: MockContext) => {
  const mix = revenueMix(ctx, scopeBase(ctx).revenue);

  return envelope(ctx, {
    labels: ctx.period.labels,
    series: [
      { key: "products", values: ctx.series(mix.products, 71, 0.1) },
      { key: "treatments", values: ctx.series(mix.treatments, 72, 0.1) },
      { key: "consultations", values: ctx.series(mix.consultations, 73, 0.1) },
    ],
    compare: null,
  });
};

const branchList = (ctx: MockContext) =>
  envelope(
    ctx,
    branchesInScope(ctx).map((branch) => {
      const missed = missedOf(branch);
      return {
        id: branch.filialId,
        name: branch.name,
        revenue: Math.round(branch.revenue * ctx.period.scale),
        visits_arrived: Math.round(branch.visits * ctx.period.scale),
        no_show_rate: pct(missed.noShow, branch.visits + missed.noShow + missed.cancelled),
        tills: Math.round(branch.till),
        open_debt: Math.round(branch.openDebt),
        stock_value: Math.round(branch.stockValue),
        // Namunadagi "mismatch" — yopilgan, lekin farq bilan; shartnomada holat `closed | open | reopened`.
        closing_status: branch.closingStatus === "mismatch" ? "closed" : branch.closingStatus,
        closing_difference: branch.closingDifference,
        attendance_rate: branch.attendanceRate,
      };
    }),
  );

const doctorList = (ctx: MockContext) => {
  const scaled = (value: number) => Math.round(value * ctx.period.scale);

  return envelope(
    ctx,
    sample.doctors
      .filter((doctor) => ctx.filials.some((filial) => filial.name === doctor.filial))
      .map((doctor) => ({
        doctor: doctor.name,
        specialty: doctor.specialty,
        filial: doctor.filial,
        visits: scaled(doctor.visits),
        treatments_revenue: scaled(doctor.visits * TREATMENT_REVENUE_PER_VISIT),
        sales_revenue: scaled(doctor.sales),
        commission_earned: scaled(doctor.commission),
        payout_outstanding: Math.round(doctor.outstanding),
      })),
  );
};

/** Ombor — hozirgi holat: faqat filial bo'yicha, davrga bog'liq emas. */
const warehouse = (ctx: MockContext) => {
  const scoped = branchesInScope(ctx);
  const stockValue = sumOf(scoped, (branch) => branch.stockValue);
  const share = stockValue / clinic.warehouse.stockValue;
  const inScope = (item: { filial: string }) => scoped.some((branch) => branch.name === item.filial);

  return envelope(ctx, {
    stock_value: Math.round(stockValue),
    sku_count: Math.max(0, ...scoped.map((branch) => BRANCH_SKU_COUNT[branch.filialId] ?? 0)),
    low: clinic.warehouse.low.filter(inScope).map((item) => ({
      product: item.product,
      quantity: item.quantity,
      min_quantity: item.minQuantity,
      filial: item.filial,
    })),
    out: clinic.warehouse.out.filter(inScope),
    received_month: Math.round(clinic.warehouse.receivedMonth * share),
    written_off_month: Math.round(clinic.warehouse.writtenOffMonth * share),
    last_count:
      scoped.length > 0
        ? {
            date: addDays(ctx.today, -LAST_COUNT.daysAgo),
            shortage: LAST_COUNT.shortage,
            surplus: LAST_COUNT.surplus,
          }
        : null,
  });
};

/** `clinic` bo'limi namunalari (`02_BACKEND_TZ` §4.5). */
export const clinicHandlers: MockHandler[] = [
  { method: "GET", path: "clinic/summary/", resolve: summary },
  { method: "GET", path: "clinic/timeseries/", resolve: timeseries },
  { method: "GET", path: "clinic/branches/", resolve: branchList },
  { method: "GET", path: "clinic/doctors/", resolve: doctorList },
  { method: "GET", path: "clinic/warehouse/", resolve: warehouse },
];
