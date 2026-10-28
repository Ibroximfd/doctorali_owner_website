import { addDays } from "@/shared/lib/scope";

import { envelope, type MockContext } from "../engine";
import type { MockHandler } from "../types";

/** Hudud → [buyurtma (30 kun), o'rtacha chek, to'langan ulush, kechikish kuni]. */
const REGIONS = [
  ["toshkent_shahar", 1840, 690_000, 1, null],
  ["toshkent", 620, 640_000, 0.92, 9],
  ["samarqand", 412, 1_370_000, 0.85, 12],
  ["fargona", 388, 610_000, 1, null],
  ["andijon", 296, 590_000, 0.6, 41],
  ["buxoro", 214, 620_000, 0, 64],
] as const;

const B2B = [
  {
    id: 4,
    name: "Shifo Farm",
    region: "andijon",
    sales_count: 7,
    amount: 64_000_000,
    paid: 40_000_000,
    oldest: 38,
  },
  {
    id: 5,
    name: "Dori-Darmon 12",
    region: "toshkent_shahar",
    sales_count: 12,
    amount: 96_000_000,
    paid: 96_000_000,
    oldest: null,
  },
  {
    id: 6,
    name: "Navbahor apteka",
    region: "samarqand",
    sales_count: 3,
    amount: 21_000_000,
    paid: 9_000_000,
    oldest: 12,
  },
] as const;

const statusOf = (debt: number, paid: number, overdue: number | null): string => {
  if (debt <= 0) return "paid";
  if (overdue !== null && overdue > 30) return "overdue";
  return paid > 0 ? "partial" : "debt";
};

const regionRows = (ctx: MockContext) =>
  REGIONS.map(([region, orders30, check, paidShare, overdue]) => {
    const orders = ctx.flow(orders30);
    const sales = orders * check;
    const expenses = Math.round(sales * 0.03);
    const courierFees = orders * 25_000;
    const netDue = Math.max(0, sales - expenses - courierFees);
    const paid = Math.round(netDue * paidShare);
    const debt = Math.max(0, netDue - paid);
    return {
      region,
      orders,
      sales,
      expenses,
      courier_fees: courierFees,
      net_due: netDue,
      paid,
      debt,
      last_payment_at: paid > 0 ? `${addDays(ctx.today, -2)}T16:20:00+05:00` : null,
      days_overdue: debt > 0 ? overdue : null,
      status: statusOf(debt, paid, debt > 0 ? overdue : null),
    };
  });

const b2bRows = () =>
  B2B.map((row) => ({
    id: row.id,
    name: row.name,
    region: row.region,
    sales_count: row.sales_count,
    amount: row.amount,
    paid: row.paid,
    debt: row.amount - row.paid,
    last_sale_at: "2026-10-20",
    oldest_debt_days: row.oldest,
  }));

const sumOf = <Row>(rows: readonly Row[], pick: (row: Row) => number): number =>
  rows.reduce((total, row) => total + pick(row), 0);

const AGE_KEY = (days: number | null): string => {
  if (days === null || days <= 7) return "0_7";
  if (days <= 30) return "8_30";
  return days <= 60 ? "31_60" : "60_plus";
};

const debts = (ctx: MockContext) =>
  [
    ...regionRows(ctx).map((row) => ({ amount: row.debt, days: row.days_overdue })),
    ...b2bRows().map((row) => ({ amount: row.debt, days: row.oldest_debt_days })),
  ].filter((row) => row.amount > 0);

const summary = (ctx: MockContext) => {
  const regions = regionRows(ctx);
  const b2b = b2bRows();
  const all = debts(ctx);
  return envelope(ctx, {
    receivable: sumOf(all, (row) => row.amount),
    overdue: sumOf(
      all.filter((row) => (row.days ?? 0) > 30),
      (row) => row.amount,
    ),
    regions_in_debt: regions.filter((row) => row.debt > 0).length,
    b2b_debt: sumOf(b2b, (row) => row.debt),
    collected: ctx.metric(
      sumOf(regions, (row) => row.paid),
      6.2,
      "uzs",
    ),
    expenses: ctx.metric(
      sumOf(regions, (row) => row.expenses),
      3.4,
      "uzs",
    ),
  });
};

const aging = (ctx: MockContext) => {
  const all = debts(ctx);
  return envelope(ctx, {
    buckets: ["0_7", "8_30", "31_60", "60_plus"].map((key) => {
      const inBucket = all.filter((row) => AGE_KEY(row.days) === key);
      return { key, amount: sumOf(inBucket, (row) => row.amount), count: inBucket.length };
    }),
  });
};

export const settlementsHandlers: MockHandler[] = [
  { method: "GET", path: "settlements/summary/", resolve: summary },
  { method: "GET", path: "settlements/regions/", resolve: (ctx) => envelope(ctx, regionRows(ctx)) },
  { method: "GET", path: "settlements/aging/", resolve: aging },
  {
    method: "GET",
    path: "settlements/b2b/",
    resolve: (ctx) => {
      const results = b2bRows();
      return envelope(ctx, { count: results.length, results });
    },
  },
];
