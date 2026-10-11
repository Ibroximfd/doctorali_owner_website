import { envelope, sparkline, type MockContext } from "../engine";
import { sample } from "../sample";
import type { MockHandler } from "../types";

type Doctor = (typeof sample.doctors)[number];

const sumOf = <Item>(items: readonly Item[], pick: (item: Item) => number): number =>
  items.reduce((sum, item) => sum + pick(item), 0);

const hasOutstanding = (doctor: Doctor): boolean => doctor.outstanding > 0;

const doctorsInScope = (ctx: MockContext): Doctor[] =>
  sample.doctors.filter((doctor) => ctx.filials.some((filial) => filial.name === doctor.filial));

/** Shifokor bitta filialga biriktirilgan — oqim ko'rsatkichlari faqat davr bo'yicha masshtablanadi. */
const doctorRow = (ctx: MockContext, doctor: Doctor) => {
  const scaled = (value: number) => Math.round(value * ctx.period.scale);

  return {
    id: doctor.id,
    full_name: doctor.name,
    specialty: doctor.specialty,
    filial: doctor.filial,
    online_consultations: scaled(doctor.online),
    clinic_visits: scaled(doctor.visits),
    orders_created: scaled(doctor.orders),
    sales_amount: scaled(doctor.sales),
    commission_earned: scaled(doctor.commission),
    payout_outstanding: Math.round(doctor.outstanding),
    rating_avg: doctor.rating,
    rating_count: doctor.ratingCount,
  };
};

const list = (ctx: MockContext) =>
  envelope(
    ctx,
    doctorsInScope(ctx)
      .map((doctor) => doctorRow(ctx, doctor))
      .sort((first, second) => second.sales_amount - first.sales_amount),
  );

/**
 * Xulosa — reyting qatorlarining yig'indisi (KPI va jadval hech qachon farq qilmaydi).
 * Faol shifokorlar va to'lov kutayotganlar soni namunadagi jamidan, tanlangan
 * filiallardagi shifokorlar ulushi bo'yicha olinadi.
 */
const summary = (ctx: MockContext) => {
  const scoped = doctorsInScope(ctx);
  const rows = scoped.map((doctor) => doctorRow(ctx, doctor));
  const share = scoped.length / sample.doctors.length;
  const waitingShare = scoped.filter(hasOutstanding).length / sample.doctors.filter(hasOutstanding).length;

  return envelope(ctx, {
    active_doctors: ctx.metric(Math.round(sample.doctorsSummary.active * share), 2.0, "count"),
    online_consultations: ctx.metric(
      sumOf(rows, (row) => row.online_consultations),
      4.9,
      "count",
    ),
    sales_amount: ctx.metric(
      sumOf(rows, (row) => row.sales_amount),
      11.2,
      "uzs",
    ),
    payout_outstanding: sumOf(rows, (row) => row.payout_outstanding),
    doctors_waiting: Math.round(sample.liabilities.doctorsWaiting * waitingShare),
    sparklines: { online_consultations: sparkline(171), sales_amount: sparkline(172) },
  });
};

/** `doctors` bo'limi namunalari (`02_BACKEND_TZ` §4.9 + xulosa). */
export const doctorsHandlers: MockHandler[] = [
  { method: "GET", path: "doctors/", resolve: list },
  { method: "GET", path: "doctors/summary/", resolve: summary },
];
