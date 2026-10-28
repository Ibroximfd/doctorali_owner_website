import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/** Bitta prognoz: kutilgan qiymat va 80% ishonch oralig'i. */
const rangeSchema = z.object({
  expected: z.number(),
  low: z.number(),
  high: z.number(),
  change_pct: z.number().nullable(),
});
export type ForecastRange = Camelized<z.infer<typeof rangeSchema>>;

/** `GET /forecast/summary/?horizon=` (`07_BACKEND_TZ_V2` §6). */
export const forecastSummarySchema = z.object({
  horizon_days: z.number(),
  model: z.string(),
  accuracy_pct: z.number().nullable(),
  revenue: rangeSchema,
  orders: rangeSchema,
  cash_in: rangeSchema,
  plan: z.object({ target: z.number(), expected_pct: z.number() }).nullable(),
});
export type ForecastSummary = Camelized<z.infer<typeof forecastSummarySchema>>;

const series = z.array(z.number().nullable());

/** `GET /forecast/timeseries/` — tarix + ufq; kelajakda `actual` = null. */
export const forecastSeriesSchema = z
  .object({
    labels: z.array(z.string()),
    actual: series,
    forecast: series,
    low: series,
    high: series,
    today_index: z.number(),
  })
  .refine(
    (value) =>
      [value.actual, value.forecast, value.low, value.high].every(
        (items) => items.length === value.labels.length,
      ),
    { message: "forecast arrays must match labels length" },
  );
export type ForecastSeries = Camelized<z.infer<typeof forecastSeriesSchema>>;

/** `GET /forecast/stockouts/` — ufq ichida tugaydigan mahsulotlar, eng yaqini birinchi. */
export const stockoutsSchema = z.array(
  z.object({
    product_id: z.number(),
    name: z.string(),
    warehouse_name: z.string(),
    qty: z.number(),
    avg_daily_out: z.number(),
    days_left: z.number(),
    stockout_date: z.string(),
    reorder_qty: z.number(),
    severity: z.string(),
  }),
);
export type Stockout = Camelized<z.infer<typeof stockoutsSchema>>[number];

/** `GET /forecast/regions/`. */
export const forecastRegionsSchema = z.array(
  z.object({
    region: z.string(),
    expected_orders: z.number(),
    expected_revenue: z.number(),
    growth_pct: z.number().nullable(),
  }),
);
export type ForecastRegion = Camelized<z.infer<typeof forecastRegionsSchema>>[number];
