import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { metricSchema } from "@/shared/lib/envelope";

const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string().nullable(),
  /** Sotilgan dona = yetkazib berish + klinika (sovg'alar alohida). */
  units: z.number(),
  revenue: z.number(),
  share_pct: z.number(),
  delivery_units: z.number(),
  clinic_units: z.number(),
  gift_units: z.number(),
  /** Omborda hisobi yuritilmaydigan mahsulotda `null`. */
  stock_quantity: z.number().nullable(),
  is_low: z.boolean(),
  trend: z.array(z.number()).default([]),
});

/**
 * `GET /products/` (`02_BACKEND_TZ` §4.9): mahsulot qatorlari (`results`) +
 * `categories`. Shartnomaga qo'shimcha — `summary` (KPI qatori) va `sparklines`.
 */
export const productsSchema = z.object({
  results: z.array(productSchema),
  categories: z.array(z.object({ name: z.string(), revenue: z.number(), share_pct: z.number() })),
  summary: z.object({
    /** `results` dagi mahsulotlar bo'yicha sotilgan dona. */
    units: metricSchema,
    /** Barcha toifalar bo'yicha mahsulot tushumi. */
    revenue: metricSchema,
    gift_units: metricSchema,
    /** Sovg'alarning taxminiy tannarxi, so'm. */
    gift_cost: z.number(),
    /** Hozir: tugagan va kam qolgan mahsulotlar soni. */
    stock_out: z.number(),
    stock_low: z.number(),
  }),
  sparklines: z.record(z.array(z.number())).default({}),
});
export type Products = Camelized<z.infer<typeof productsSchema>>;
export type Product = Products["results"][number];
export type ProductCategory = Products["categories"][number];
