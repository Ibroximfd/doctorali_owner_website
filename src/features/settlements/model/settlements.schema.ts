import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { metricSchema } from "@/shared/lib/envelope";

/** `GET /settlements/summary/` (`07_BACKEND_TZ_V2` §3). Qarzlar — hozirgi holat, to'lov/xarajat — davr. */
export const settlementsSummarySchema = z.object({
  receivable: z.number(),
  overdue: z.number(),
  regions_in_debt: z.number(),
  b2b_debt: z.number(),
  collected: metricSchema,
  expenses: metricSchema,
});
export type SettlementsSummary = Camelized<z.infer<typeof settlementsSummarySchema>>;

/** `GET /settlements/regions/`. `status` — ochiq ro'yxat. */
export const regionSettlementsSchema = z.array(
  z.object({
    region: z.string(),
    orders: z.number(),
    sales: z.number(),
    expenses: z.number(),
    courier_fees: z.number(),
    net_due: z.number(),
    paid: z.number(),
    debt: z.number(),
    last_payment_at: z.string().nullable(),
    days_overdue: z.number().nullable(),
    status: z.string(),
  }),
);
export type RegionSettlement = Camelized<z.infer<typeof regionSettlementsSchema>>[number];

/** `GET /settlements/aging/` — qarz muddatlari. `key` — ochiq ro'yxat. */
export const agingSchema = z.object({
  buckets: z.array(z.object({ key: z.string(), amount: z.number(), count: z.number() })),
});
export type Aging = Camelized<z.infer<typeof agingSchema>>;

/** `GET /settlements/b2b/` — dorixonalar. */
export const b2bSchema = z.object({
  count: z.number(),
  results: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      region: z.string().nullable(),
      sales_count: z.number(),
      amount: z.number(),
      paid: z.number(),
      debt: z.number(),
      last_sale_at: z.string().nullable(),
      oldest_debt_days: z.number().nullable(),
    }),
  ),
});
export type B2bClient = Camelized<z.infer<typeof b2bSchema>>["results"][number];
