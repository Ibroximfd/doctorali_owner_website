import { z } from "zod";

import { alertSchema } from "@/shared/domain/alert";
import type { Camelized } from "@/shared/lib/camelize";
import { metricSchema } from "@/shared/lib/envelope";

/** `GET /overview/` (`02_BACKEND_TZ` §4.2). */
export const overviewSchema = z.object({
  revenue: z.object({
    total: metricSchema,
    delivery: metricSchema,
    clinic: metricSchema,
    consultation: metricSchema,
  }),
  /** Filtrdan mustaqil tezkor ko'rsatkichlar (hero ostidagi 4 katak). */
  revenue_quick: z.object({
    today: z.number(),
    today_same_time_yesterday: z.number(),
    yesterday: z.number(),
    week: z.number(),
    month: z.number(),
  }),
  plan: z
    .object({
      month: z.string(),
      target: z.number(),
      actual: z.number(),
      pct: z.number(),
      expected_pct: z.number(),
      previous: z
        .object({ month: z.string(), target: z.number(), actual: z.number(), pct: z.number() })
        .nullable(),
    })
    .nullable(),
  kpis: z.object({
    orders: metricSchema,
    delivered: metricSchema,
    delivery_rate: metricSchema,
    avg_check: metricSchema,
    clinic_visits: metricSchema,
    new_customers: metricSchema,
    app_active_users: metricSchema,
  }),
  sparklines: z.record(z.array(z.number())).default({}),
  pipeline_now: z.array(
    z.object({ status: z.string(), count: z.number(), amount: z.number(), stale_count: z.number() }),
  ),
  cash_position: z.object({
    clinic_tills: z.number(),
    courier_cod: z.number(),
    online_received: z.number(),
    open_debt: z.number(),
    overdue_debt: z.number(),
  }),
  alerts: z.object({
    open_total: z.number(),
    critical: z.number(),
    serious: z.number(),
    top: z.array(alertSchema),
  }),
  filials: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      revenue: metricSchema,
      orders: z.number(),
      /** Davrda yakunlangan buyurtma bo'lmasa `null`. */
      delivery_rate: z.number().nullable(),
      clinic_revenue: z.number().nullable(),
      open_debt: z.number().nullable(),
      courier_cod: z.number(),
    }),
  ),
});
export type Overview = Camelized<z.infer<typeof overviewSchema>>;

/** `GET /feed/` — muhim hodisalar lentasi. */
export const feedSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      at: z.string(),
      kind: z.string(),
      filial: z.string().nullable(),
      title: z.string(),
      amount: z.number().nullable(),
      actor: z.string().nullable(),
      ref: z.object({ type: z.string(), id: z.string() }).nullable(),
    }),
  ),
});
export type FeedEvent = Camelized<z.infer<typeof feedSchema>>["results"][number];
