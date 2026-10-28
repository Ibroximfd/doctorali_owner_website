import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { metricSchema } from "@/shared/lib/envelope";

/** `GET /warehouse/summary/` (`07_BACKEND_TZ_V2` §2). Qoldiq — hozirgi holat, kirim/chiqim — davr. */
export const warehouseSummarySchema = z.object({
  stock_units: z.number(),
  stock_value: z.number(),
  sku_count: z.number(),
  low_skus: z.number(),
  out_skus: z.number(),
  /** Chiqim bo'lmasa `null` — «necha kunga yetadi» o'lchanmaydi. */
  days_of_cover: z.number().nullable(),
  inbound: metricSchema,
  outbound: metricSchema,
  /** Oxirgi qotirilgan (23:00) qoldiq; `null` — jonli hisob. */
  snapshot_at: z.string().nullable(),
});
export type WarehouseSummary = Camelized<z.infer<typeof warehouseSummarySchema>>;

const keeperSchema = z.object({ id: z.number(), full_name: z.string(), phone: z.string().nullable() });

/** `GET /warehouse/warehouses/`. `status`, `source` — ochiq ro'yxat (yangi qiymat yiqitmaydi). */
export const warehousesSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    source: z.string(),
    regions: z.array(z.string()),
    keeper: keeperSchema.nullable(),
    stock_units: z.number(),
    stock_value: z.number(),
    inbound: z.number(),
    outbound: z.number(),
    low_skus: z.number(),
    out_skus: z.number(),
    days_of_cover: z.number().nullable(),
    status: z.string(),
    last_movement_at: z.string().nullable(),
  }),
);
export type Warehouse = Camelized<z.infer<typeof warehousesSchema>>[number];

/** `GET /warehouse/stock/` — eng xavflisi birinchi. */
export const stockSchema = z.array(
  z.object({
    product_id: z.number(),
    name: z.string(),
    sku: z.string(),
    warehouse_id: z.number(),
    warehouse_name: z.string(),
    qty: z.number(),
    value: z.number(),
    min_qty: z.number().nullable(),
    avg_daily_out: z.number(),
    days_of_cover: z.number().nullable(),
    stockout_date: z.string().nullable(),
    status: z.string(),
  }),
);
export type StockRow = Camelized<z.infer<typeof stockSchema>>[number];

const mixNumbers = {
  full_units: z.number(),
  discount_units: z.number(),
  gift_units: z.number(),
  full_revenue: z.number(),
  discount_revenue: z.number(),
  discount_amount: z.number(),
  gift_value: z.number(),
  avg_discount_pct: z.number().nullable(),
};

/** `GET /warehouse/sales-mix/` — chiqim tarkibi: to'liq narx · chegirma · sovg'a. `reason` — ochiq ro'yxat. */
export const salesMixSchema = z.object({
  totals: z.object({ ...mixNumbers, gift_cost: z.number().nullable() }),
  products: z.array(z.object({ product_id: z.number(), name: z.string(), ...mixNumbers })),
  reasons: z.array(z.object({ kind: z.string(), reason: z.string(), units: z.number(), amount: z.number() })),
});
export type SalesMix = Camelized<z.infer<typeof salesMixSchema>>;
