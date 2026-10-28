import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/** `GET /regions/` (`08_PLATFORM_ACCESS_AND_AI_OPS` §E.1) — davr bo'yicha sotuv + hozirgi ombor va kuryerlar. */
export const regionsSchema = z.array(
  z.object({
    region: z.string(),
    orders: z.number(),
    delivered: z.number(),
    cancelled: z.number(),
    revenue: z.number(),
    success_rate: z.number().nullable(),
    growth_pct: z.number().nullable(),
    stock_units: z.number(),
    stock_value: z.number(),
    low_skus: z.number(),
    couriers_total: z.number(),
    couriers_working: z.number(),
    cash_on_couriers: z.number(),
  }),
);
export type RegionRow = Camelized<z.infer<typeof regionsSchema>>[number];

/** `GET /regions/{code}/live/` (§E.2) — viloyat ichida hozir nima bo'lyapti. */
export const regionLiveSchema = z.object({
  region: z.string(),
  summary: z.object({
    orders_today: z.number(),
    delivered_today: z.number(),
    in_transit: z.number(),
    pending: z.number(),
    stuck: z.number(),
    cash_on_couriers: z.number(),
    stock_units: z.number(),
    stock_value: z.number(),
    low_skus: z.number(),
  }),
  warehouses: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      lat: z.number().nullable(),
      lng: z.number().nullable(),
      status: z.string(),
      keeper: z.string().nullable(),
      stock_units: z.number(),
      stock_value: z.number(),
      products: z.array(
        z.object({
          name: z.string(),
          qty: z.number(),
          status: z.string(),
          days_of_cover: z.number().nullable(),
        }),
      ),
    }),
  ),
  couriers: z.array(
    z.object({
      id: z.number(),
      full_name: z.string(),
      status: z.string(),
      lat: z.number().nullable(),
      lng: z.number().nullable(),
      heading: z.number().nullable(),
      speed_kmh: z.number().nullable(),
      last_signal_at: z.string().nullable(),
      task: z
        .object({
          kind: z.string(),
          order_number: z.string().nullable(),
          address: z.string().nullable(),
          eta_minutes: z.number().nullable(),
        })
        .nullable(),
      assigned_today: z.number(),
      delivered_today: z.number(),
      cancelled_today: z.number(),
      cash_on_hand: z.number(),
      cash_since: z.string().nullable(),
    }),
  ),
  orders: z.record(z.number()),
});
export type RegionLive = Camelized<z.infer<typeof regionLiveSchema>>;
export type RegionCourier = RegionLive["couriers"][number];
export type RegionWarehouse = RegionLive["warehouses"][number];
