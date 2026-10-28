import { addDays } from "@/shared/lib/scope";

import { envelope, rng, type MockContext } from "../engine";
import type { MockHandler } from "../types";

const HISTORY_DAYS = 60;
const DAILY = { revenue: 320_000_000, orders: 204 } as const;

const horizonOf = (ctx: MockContext): number => {
  const value = Number(ctx.searchParams.get("horizon"));
  return value === 7 || value === 90 ? value : 30;
};

const range = (expected: number, spread: number, change: number) => ({
  expected: Math.round(expected),
  low: Math.round(expected * (1 - spread)),
  high: Math.round(expected * (1 + spread)),
  change_pct: change,
});

const summary = (ctx: MockContext) => {
  const horizon = horizonOf(ctx);
  return envelope(ctx, {
    horizon_days: horizon,
    model: "holt_winters",
    accuracy_pct: 91.2,
    revenue: range(DAILY.revenue * horizon * 1.04, 0.07, 8.4),
    orders: range(DAILY.orders * horizon * 1.03, 0.06, 6.1),
    cash_in: range(DAILY.revenue * horizon * 0.94, 0.07, 5.2),
    plan: { target: 10_000_000_000, expected_pct: 98.4 },
  });
};

/** Tarix (60 kun) + ufq; bugun ikkala qatorda bir xil — chiziq uzilmaydi. */
const timeseries = (ctx: MockContext) => {
  const horizon = horizonOf(ctx);
  const base = ctx.searchParams.get("metric") === "orders" ? DAILY.orders : DAILY.revenue;
  const random = rng(77);
  const total = HISTORY_DAYS + horizon;
  const labels = Array.from({ length: total }, (_, index) => addDays(ctx.today, index - HISTORY_DAYS + 1));
  const trend = (index: number) => Math.round(base * (0.9 + (index / total) * 0.2));
  const todayIndex = HISTORY_DAYS - 1;
  const actual = labels.map((_, index) =>
    index <= todayIndex ? Math.round(trend(index) * (0.88 + random() * 0.24)) : null,
  );
  const forecast = labels.map((_, index) =>
    index < todayIndex ? null : index === todayIndex ? (actual[todayIndex] ?? null) : trend(index),
  );
  const spread = (index: number) => 0.04 + ((index - todayIndex) / horizon) * 0.08;
  return envelope(ctx, {
    labels,
    actual,
    forecast,
    low: forecast.map((value, index) => (value === null ? null : Math.round(value * (1 - spread(index))))),
    high: forecast.map((value, index) => (value === null ? null : Math.round(value * (1 + spread(index))))),
    today_index: todayIndex,
  });
};

const stockouts = (ctx: MockContext) => {
  const horizon = horizonOf(ctx);
  return envelope(
    ctx,
    [
      {
        product_id: 7,
        name: "Mehrigiyo balzami",
        warehouse_name: "Toshkent markaziy",
        qty: 84,
        avg_daily_out: 31.5,
        severity: "critical",
      },
      {
        product_id: 9,
        name: "Asal-propolis",
        warehouse_name: "Qo'qon",
        qty: 0,
        avg_daily_out: 6,
        severity: "critical",
      },
      {
        product_id: 8,
        name: "Shifobaxsh choy",
        warehouse_name: "Samarqand",
        qty: 260,
        avg_daily_out: 11,
        severity: "high",
      },
    ]
      .map((row) => {
        const daysLeft = Math.round((row.qty / row.avg_daily_out) * 10) / 10;
        return {
          ...row,
          days_left: daysLeft,
          stockout_date: addDays(ctx.today, Math.floor(daysLeft)),
          reorder_qty: Math.max(0, Math.ceil(row.avg_daily_out * (horizon + 7) - row.qty)),
        };
      })
      .filter((row) => row.days_left <= horizon)
      .sort((a, b) => a.days_left - b.days_left),
  );
};

const regions = (ctx: MockContext) => {
  const horizon = horizonOf(ctx);
  return envelope(
    ctx,
    [
      ["toshkent_shahar", 71, 9.2],
      ["samarqand", 18, 24.5],
      ["fargona", 12, -2.1],
      ["andijon", 9, 6.4],
    ].map(([region, perDay, growth]) => ({
      region,
      expected_orders: Number(perDay) * horizon,
      expected_revenue: Number(perDay) * horizon * 690_000,
      growth_pct: growth,
    })),
  );
};

export const forecastHandlers: MockHandler[] = [
  { method: "GET", path: "forecast/summary/", resolve: summary },
  { method: "GET", path: "forecast/timeseries/", resolve: timeseries },
  { method: "GET", path: "forecast/stockouts/", resolve: stockouts },
  { method: "GET", path: "forecast/regions/", resolve: regions },
];
