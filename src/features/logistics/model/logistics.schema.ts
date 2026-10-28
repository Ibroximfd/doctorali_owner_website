import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { metricSchema, nullableMetricSchema, timeseriesSchema } from "@/shared/lib/envelope";

/** `GET /logistics/summary/` (`02_BACKEND_TZ` §4.6). `*_now` va naqd — hozirgi holat, qolgani davr bo'yicha. */
export const logisticsSummarySchema = z.object({
  in_transit_now: z.number(),
  late_now: z.number(),
  unassigned_now: z.number(),
  delivered: metricSchema,
  /** Davrda yakunlangan buyurtma bo'lmasa `null` (nol emas). */
  success_rate: nullableMetricSchema,
  avg_delivery_minutes: nullableMetricSchema,
  attempts: metricSchema,
  cod_unsettled: z.number(),
  /** Naqdni topshirmagan kuryerlar soni. */
  cod_unsettled_couriers: z.number(),
  /** KPI kataklaridagi mini trendlar (kalit — ko'rsatkich nomi). */
  sparklines: z.record(z.array(z.number())).default({}),
});
export type LogisticsSummary = Camelized<z.infer<typeof logisticsSummarySchema>>;

const courierSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  filial: z.string(),
  is_active: z.boolean(),
  assigned: z.number(),
  delivered: z.number(),
  cancelled: z.number(),
  success_rate: z.number().nullable(),
  avg_minutes: z.number().nullable(),
  attempts: z.number(),
  cod_collected: z.number(),
  cod_unsettled: z.number(),
  oldest_unsettled_at: z.string().nullable(),
});

/** `GET /logistics/couriers/`. */
export const couriersSchema = z.array(courierSchema);
export type Courier = Camelized<z.infer<typeof courierSchema>>;

/** `GET /logistics/couriers/{id}/` — bitta kuryer: jadvaldagi ko'rsatkichlar + kunlik trend. */
export const courierDetailSchema = courierSchema.extend({ timeseries: timeseriesSchema });
export type CourierDetail = Camelized<z.infer<typeof courierDetailSchema>>;

/** `GET /logistics/regions/` — `region` hudud kodi (nomi `meta` lug'atidan). */
export const regionDeliverySchema = z.array(
  z.object({
    region: z.string(),
    orders: z.number(),
    delivered: z.number(),
    avg_minutes: z.number().nullable(),
    success_rate: z.number().nullable(),
  }),
);
export type RegionDelivery = Camelized<z.infer<typeof regionDeliverySchema>>[number];

/** `GET /logistics/attempt-reasons/` — noma'lum sabab yiqitmaydi (`reason` — satr). */
export const attemptReasonsSchema = z.array(
  z.object({ reason: z.string(), count: z.number(), share_pct: z.number() }),
);
export type AttemptReason = Camelized<z.infer<typeof attemptReasonsSchema>>[number];

/** `GET /logistics/transfers/` — filiallararo ko'chirishlar + jami soni. */
export const transfersSchema = z.object({
  count: z.number(),
  results: z.array(
    z.object({
      id: z.number(),
      number: z.string(),
      from_filial: z.string(),
      to_filial: z.string(),
      status: z.string(),
      items_count: z.number(),
      created_at: z.string(),
    }),
  ),
});
export type Transfer = Camelized<z.infer<typeof transfersSchema>>["results"][number];

/** `GET /logistics/live/` (`07_BACKEND_TZ_V2` §4) — hozirgi holat; `status`, `source` — ochiq ro'yxat. */
export const liveSchema = z.object({
  couriers: z.array(
    z.object({
      id: z.number(),
      full_name: z.string(),
      filial: z.string(),
      region: z.string(),
      source: z.string(),
      status: z.string(),
      speed_kmh: z.number().nullable(),
      last_signal_at: z.string().nullable(),
      shift_started_at: z.string().nullable(),
      battery_pct: z.number().nullable(),
      assigned_today: z.number(),
      delivered_today: z.number(),
      cancelled_today: z.number(),
      cash_on_hand: z.number(),
      cash_since: z.string().nullable(),
      handover_pending: z.number().nullable(),
    }),
  ),
  regions: z.array(
    z.object({
      region: z.string(),
      couriers_total: z.number(),
      couriers_working: z.number(),
      delivered_today: z.number(),
      pending_today: z.number(),
      cash_today: z.number(),
    }),
  ),
});
export type LiveBoard = Camelized<z.infer<typeof liveSchema>>;
export type LiveCourier = LiveBoard["couriers"][number];

/** `GET /logistics/handovers/` — kassaga topshirish so'rovlari va so'nggi qarorlar. */
export const handoversSchema = z.object({
  pending: z.array(
    z.object({
      id: z.number(),
      courier_id: z.number(),
      courier_name: z.string(),
      amount: z.number(),
      requested_at: z.string(),
    }),
  ),
  recent: z.array(
    z.object({
      id: z.number(),
      courier_name: z.string(),
      amount: z.number(),
      status: z.string(),
      decided_at: z.string(),
      decided_by: z.string().nullable(),
    }),
  ),
});
export type Handovers = Camelized<z.infer<typeof handoversSchema>>;
