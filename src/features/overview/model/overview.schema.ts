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
 * «Umumiy» — `GET /api/owner/overview/v2/` (B-11, B-17). Jonli javob (2026-10-31): `money_chain`
 * (`with_couriers`, `with_chiefs`, `handed_to_filials`), `orders` (`lead`, `otkaz`),
 * `conversion_pct`, `filials[]` (`otkaz`, `otkaz_pct`), tushum `revenue` (satr) va solishtiruv:
 * `previous` (teng uzunlikdagi oldingi davr) + `delta_pct` — ikkalasi ham har ko'rsatkich uchun
 * obyekt (oldingisi 0 — `null`, o'zgarish chizilmaydi). Pul zanjiri solishtirilmaydi — u joriy
 * qoldiq. Atkaz foizi javobda yo'q — zakazlardan hisoblanadi.
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Solishtiriladigan zakaz ko'rsatkichlari — `orders`, `previous` va `delta_pct` dagi nomlar. */
const ORDER_KEYS = ["lead", "sold", "in_transit", "delivered", "otkaz"] as const;

/**
 * Ko'rsatkich `Metric` ga: tayyor `Metric` (namuna) bo'lsa o'zi; aks holda qiymat + `previous[key]`
 * + `delta_pct[key]`. `delta_pct` backenddan, o'zgartirilmaydi (`null` — o'zgarish chizilmaydi).
 */
const withCompare = (
  value: unknown,
  previous: Record<string, unknown>,
  delta: Record<string, unknown>,
  key: string,
) => (isRecord(value) ? value : { value, previous: previous[key] ?? null, delta_pct: delta[key] ?? null });

/**
 * Jonli javob (B-17): `previous` va `delta_pct` — har ko'rsatkich uchun obyekt
 * (`{lead, sold, in_transit, delivered, otkaz, revenue, conversion_pct}`) — tushum, zakazlar va
 * konversiya `Metric` ga yig'iladi. Tushum yo'q bo'lsa — filiallar yig'indisi.
 */
const withComparison = <Shape extends z.ZodTypeAny>(schema: Shape) =>
  z.preprocess((raw) => {
    if (!isRecord(raw)) return raw;
    const previous = isRecord(raw.previous) ? raw.previous : {};
    const delta = isRecord(raw.delta_pct) ? raw.delta_pct : {};
    const orders = isRecord(raw.orders) ? raw.orders : {};
    return {
      ...raw,
      revenue: withCompare(raw.revenue ?? sumOf(raw.filials, "revenue"), previous, delta, "revenue"),
      conversion_pct: withCompare(raw.conversion_pct, previous, delta, "conversion_pct"),
      orders: {
        ...orders,
        ...Object.fromEntries(
          ORDER_KEYS.filter((key) => key in orders).map((key) => [
            key,
            withCompare(orders[key], previous, delta, key),
          ]),
        ),
      },
    };
  }, schema);

export const overviewSchema = withComparison(
  withDefaults(
    (raw) => {
      const orders = (raw.orders ?? {}) as Record<string, unknown>;
      // atkaz foizi — joriy sonlardan (`Metric` bo'lsa uning `value` i)
      const count = (metricOrNumber: unknown) =>
        isRecord(metricOrNumber) ? metricOrNumber.value : metricOrNumber;
      return { cancel_rate: percentOf(count(orders.otkaz ?? orders.cancelled), count(orders.sold)) };
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
  ),
);

export type Overview = Camelized<z.infer<typeof overviewSchema>>;
export type OverviewFilial = Overview["filials"][number];
