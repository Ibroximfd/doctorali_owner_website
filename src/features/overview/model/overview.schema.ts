import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import {
  aliases,
  balance,
  list,
  metric,
  num,
  optNum,
  percentOf,
  str,
  sumOf,
  withDefaults,
  withFilialCode,
} from "@/shared/lib/lenient";

/**
 * «Umumiy» — `GET /api/owner/overview/v2/` (B-11). Jonli javob (2026-10-31): `money_chain`
 * (`with_couriers`, `with_chiefs`, `handed_to_filials`), `orders` (`lead`, `otkaz`),
 * `conversion_pct`, `filials[]` (`otkaz`, `otkaz_pct`). Tushum va atkaz foizi javobda yo'q —
 * filiallar yig'indisidan hisoblanadi; o'tgan davr bilan solishtirish (`delta`) kelmaydi.
 */
const moneySchema = aliases(
  {
    at_couriers: ["with_couriers"],
    at_chiefs: ["with_chiefs"],
    handed: ["handed_to_filials", "handed_over"],
  },
  z.object({ at_couriers: balance, at_chiefs: balance, handed: balance }),
);

const filialSchema = withFilialCode(
  aliases(
    { cancelled: ["otkaz"], cancel_rate_pct: ["otkaz_pct"] },
    z.object({
      id: num,
      code: str,
      name: str,
      is_main: z.boolean().default(false),
      sold: num,
      delivered: num,
      cancelled: num,
      revenue: num,
      conversion_pct: optNum,
      cancel_rate_pct: optNum,
    }),
  ),
);

const ordersSchema = aliases(
  { leads: ["lead"], cancelled: ["otkaz"] },
  z.object({ leads: metric, sold: metric, in_transit: metric, delivered: metric, cancelled: metric }),
);

export const overviewSchema = withDefaults(
  (raw) => {
    const orders = (raw.orders ?? {}) as Record<string, unknown>;
    return {
      revenue: sumOf(raw.filials, "revenue"),
      cancel_rate: percentOf(orders.otkaz ?? orders.cancelled, orders.sold),
    };
  },
  aliases(
    { money: ["money_chain"], conversion: ["conversion_pct"], cancel_rate: ["cancel_rate_pct"] },
    z.object({
      /** Yetkazilgan zakazlar puli (davr). */
      revenue: metric,
      /** Pul hozir qayerda: kuryerda → bosh kuryerda → filialga topshirildi. */
      money: z.preprocess((raw) => raw ?? {}, moneySchema),
      orders: z.preprocess((raw) => raw ?? {}, ordersSchema),
      conversion: metric,
      cancel_rate: metric,
      filials: list(filialSchema),
    }),
  ),
);

export type Overview = Camelized<z.infer<typeof overviewSchema>>;
export type OverviewFilial = Overview["filials"][number];
