import { addDays } from "@/shared/lib/scope";

import { apportion, envelope, sparkline, type MockContext } from "../engine";
import { sample } from "../sample";
import type { MockHandler } from "../types";

/** `ctx.series` dan faqat shakl (vazn) olish uchun yetarlicha katta jami. */
const SHAPE_TOTAL = 1_000_000;

const sumOf = <Item>(items: readonly Item[], pick: (item: Item) => number): number =>
  items.reduce((sum, item) => sum + pick(item), 0);

/** Yangi mijozlar soni "Umumiy" sahifadagi KPI bilan bir xil manbadan. */
const newCustomers = (ctx: MockContext): number => ctx.flow(sample.kpi.newCustomers);

/**
 * Qaytgan mijozlar soni ulushdan chiqariladi: qaytgan ÷ (yangi + qaytgan) =
 * `returning_rate`. Shunda KPI va grafik bir-biriga zid kelmaydi.
 */
const returningCustomers = (ctx: MockContext): number => {
  const rate = sample.customers.returningRate;
  return Math.round((newCustomers(ctx) * rate) / (100 - rate));
};

const summary = (ctx: MockContext) => {
  const { customers } = sample;

  return envelope(ctx, {
    total: ctx.metric(ctx.stock(customers.total), 2.1, "count"),
    new: ctx.metric(newCustomers(ctx), -3.4, "count"),
    returning_rate: ctx.metric(customers.returningRate, 1.9, "pct"),
    repeat_purchase_rate: ctx.metric(customers.repeatPurchaseRate, 0.8, "pct"),
    avg_ltv: ctx.metric(customers.avgLtv, 4.0, "uzs"),
    avg_orders_per_customer: ctx.metric(customers.avgOrdersPerCustomer, 1.2),
    sparklines: {
      total: sparkline(151, 0.4),
      new: sparkline(152, -0.2),
      returning_rate: sparkline(153, 0.15),
      repeat_purchase_rate: sparkline(154, 0.1),
      avg_ltv: sparkline(155, 0.2),
      avg_orders_per_customer: sparkline(156, 0.1),
    },
  });
};

const timeseries = (ctx: MockContext) =>
  envelope(ctx, {
    labels: ctx.period.labels,
    series: [
      { key: "returning", values: apportion(returningCustomers(ctx), ctx.series(SHAPE_TOTAL, 161, 0.2)) },
      { key: "new", values: apportion(newCustomers(ctx), ctx.series(SHAPE_TOTAL, 162, -0.1)) },
    ],
    compare: null,
  });

/** `YYYY-MM-DD` dan `monthsAgo` oy oldingi oy (`YYYY-MM`). */
const monthBefore = (today: string, monthsAgo: number): string => {
  const date = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - monthsAgo);
  return date.toISOString().slice(0, 7);
};

/** Kogortalar davrga bog'liq emas (har doim oxirgi 6 oy) — faqat filial bo'yicha masshtablanadi. */
const cohorts = (ctx: MockContext) =>
  envelope(
    ctx,
    sample.customers.cohorts.map((cohort) => ({
      cohort: monthBefore(ctx.today, cohort.monthsAgo),
      size: ctx.stock(cohort.size),
      retention: cohort.retention,
    })),
  );

/** Butun tarix bo'yicha eng qimmatli mijozlar — davrga qarab o'zgarmaydi. */
const top = (ctx: MockContext) =>
  envelope(
    ctx,
    sample.customers.top.map((customer) => ({
      lead_id: customer.leadId,
      full_name: customer.name,
      phone: customer.phone,
      region: customer.region,
      orders_count: customer.orders,
      total_spent: Math.round(customer.spent),
      last_order_at: `${addDays(ctx.today, -customer.lastOrderDaysAgo)}T10:30:00+05:00`,
      has_app: customer.hasApp,
    })),
  );

/** Mijozlar bazasi hududlarga buyurtmalar ulushi bo'yicha taqsimlanadi; yig'indi = jami mijozlar. */
const regions = (ctx: MockContext) => {
  const orders = sample.regions.map((region) => region.count);
  const ordersTotal = sumOf(orders, (count) => count);
  const customers = apportion(ctx.stock(sample.customers.total), orders);
  const revenue = ctx.flow(sample.revenue.delivery);

  return envelope(
    ctx,
    sample.regions.map((region, index) => ({
      region: region.code,
      customers: customers[index] ?? 0,
      revenue: Math.round((revenue * region.count) / ordersTotal),
    })),
  );
};

/** `customers` bo'limi namunalari (`02_BACKEND_TZ` §4.9 + `customers/timeseries/`). */
export const customersHandlers: MockHandler[] = [
  { method: "GET", path: "customers/summary/", resolve: summary },
  { method: "GET", path: "customers/timeseries/", resolve: timeseries },
  { method: "GET", path: "customers/cohorts/", resolve: cohorts },
  { method: "GET", path: "customers/top/", resolve: top },
  { method: "GET", path: "customers/regions/", resolve: regions },
];
