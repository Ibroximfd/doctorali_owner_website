import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { metricSchema } from "@/shared/lib/envelope";

/** `GET /customers/summary/` (`02_BACKEND_TZ` §4.9) — hammasi `Metric`. */
export const customersSummarySchema = z.object({
  total: metricSchema,
  new: metricSchema,
  returning_rate: metricSchema,
  repeat_purchase_rate: metricSchema,
  avg_ltv: metricSchema,
  avg_orders_per_customer: metricSchema,
  /** Shartnomaga qo'shimcha: KPI kataklaridagi mini trend (`overview` dagidek). */
  sparklines: z.record(z.array(z.number())).default({}),
});
export type CustomersSummary = Camelized<z.infer<typeof customersSummarySchema>>;

/**
 * `GET /customers/cohorts/` — oylik kogortalar (oxirgi 6 oy). `retention[n]` —
 * birinchi xariddan `n` oy o'tib yana xarid qilganlar ulushi (%); hali
 * o'tmagan oylar ro'yxatda yo'q.
 */
export const cohortsSchema = z.array(
  z.object({ cohort: z.string(), size: z.number(), retention: z.array(z.number()) }),
);
export type Cohort = Camelized<z.infer<typeof cohortsSchema>>[number];

/** `GET /customers/top/` — jami xarid summasi bo'yicha eng qimmatli mijozlar. */
export const topCustomersSchema = z.array(
  z.object({
    /** Ilova/shovrum/shifokor buyurtmasida lid yo'q — `null`. */
    lead_id: z.number().nullable(),
    full_name: z.string(),
    phone: z.string(),
    region: z.string().nullable(),
    orders_count: z.number(),
    total_spent: z.number(),
    last_order_at: z.string().nullable(),
    has_app: z.boolean(),
  }),
);
export type TopCustomer = Camelized<z.infer<typeof topCustomersSchema>>[number];

/** `GET /customers/regions/`. `region` — hudud kodi (nomi `meta/` dan olinadi). */
export const customerRegionsSchema = z.array(
  z.object({ region: z.string(), customers: z.number(), revenue: z.number() }),
);
export type CustomerRegion = Camelized<z.infer<typeof customerRegionsSchema>>[number];
