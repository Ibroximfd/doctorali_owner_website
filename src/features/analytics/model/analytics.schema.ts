import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import {
  aliases,
  flattenRef,
  list,
  num,
  numbers,
  optNum,
  optStr,
  percentOf,
  str,
  withDefaults,
  withFilialCode,
} from "@/shared/lib/lenient";

/**
 * «Analitika» — `GET /api/owner/analytics/v2/` (B-13). Jonli javob (2026-10-31): `totals`
 * (`otkaz`), `by_filial[]`, `products[{item:{id,name}, sold_qty, delivered_qty, otkaz_qty}]`,
 * `operators[{filial:{id,name}, sold, delivered, otkaz}]`. Kunlik trend, operator lidlari va
 * atkaz foizi javobda yo'q — foiz hisoblanadi, trend bo'sh.
 */
const cancelRate = <Shape extends z.ZodTypeAny>(schema: Shape) =>
  withDefaults(
    (raw) =>
      raw.otkaz_pct === undefined ? { cancel_rate_pct: percentOf(raw.cancelled ?? raw.otkaz, raw.sold) } : {},
    schema,
  );

const RATE_ALIASES = { cancelled: ["otkaz"], cancel_rate_pct: ["otkaz_pct"] } as const;
const rates = { conversion_pct: optNum, cancel_rate_pct: optNum };

const trendSchema = z.preprocess(
  (raw) => raw ?? {},
  z.object({ labels: list(z.string()), sold: numbers(), cancelled: numbers() }),
);

export const analyticsSchema = aliases(
  { filials: ["by_filial"] },
  z.object({
    totals: z.preprocess(
      (raw) => raw ?? {},
      cancelRate(
        aliases(RATE_ALIASES, z.object({ leads: num, sold: num, delivered: num, cancelled: num, ...rates })),
      ),
    ),
    /** Kunlik (soatlik/haftalik) sotuv va atkaz — `labels` o'qida. Jonli javobda yo'q. */
    trend: trendSchema,
    filials: list(
      withFilialCode(
        cancelRate(
          aliases(
            RATE_ALIASES,
            z.object({
              id: num,
              code: str,
              name: str,
              leads: num,
              sold: num,
              delivered: num,
              cancelled: num,
              ...rates,
            }),
          ),
        ),
      ),
    ),
    products: list(
      flattenRef(
        "item",
        cancelRate(
          aliases(
            {
              id: ["item_id"],
              name: ["item_name"],
              sold: ["sold_qty"],
              delivered: ["delivered_qty"],
              cancelled: ["otkaz_qty", "otkaz"],
              image: ["item_image", "image_url", "item_image_url", "photo"],
            },
            z.object({
              id: num,
              name: str,
              sold: num,
              delivered: num,
              cancelled: num,
              revenue: num,
              cancel_rate_pct: optNum,
              /** Rasm — jonli javobda yo'q (B-27). */
              image: optStr,
            }),
          ),
        ),
      ),
    ),
    operators: list(
      flattenRef(
        "filial",
        cancelRate(
          aliases(
            RATE_ALIASES,
            z.object({
              id: num,
              full_name: str,
              filial_id: num,
              leads: num,
              sold: num,
              cancelled: num,
              ...rates,
            }),
          ),
        ),
      ),
    ),
  }),
);

export type Analytics = Camelized<z.infer<typeof analyticsSchema>>;
export type AnalyticsFilial = Analytics["filials"][number];
export type ProductRow = Analytics["products"][number];
export type OperatorRow = Analytics["operators"][number];
