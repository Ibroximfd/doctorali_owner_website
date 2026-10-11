import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { metricSchema } from "@/shared/lib/envelope";

/**
 * Buyurtmalar bo'limi shartnomasi (`02_BACKEND_TZ` §4.3). Enum qiymatlari
 * (status, manba, sabab, to'lov …) ataylab `z.string()` — backend yangi qiymat
 * qo'shsa sahifa yiqilmaydi, UI uni "noma'lum" yoki xom holida ko'rsatadi.
 */

/** `GET /orders/summary/`. `sparklines` — KPI mini trendlari (shartnomaga qo'shimcha, `overview` dagi kabi). */
export const ordersSummarySchema = z.object({
  orders: metricSchema,
  confirmed_rate: metricSchema,
  delivered: metricSchema,
  delivery_rate: metricSchema,
  cancel_rate: metricSchema,
  avg_check: metricSchema,
  avg_delivery_minutes: metricSchema,
  sparklines: z.record(z.array(z.number())).default({}),
});
export type OrdersSummary = Camelized<z.infer<typeof ordersSummarySchema>>;

const cohortShareSchema = z.object({ count: z.number(), pct_of_created: z.number() });

/**
 * `GET /orders/funnel/` — davrda yaratilgan buyurtmalar kogortasi.
 * `cancelled` va `in_progress` — voronka ostidagi yakun uchun (shartnomaga qo'shimcha).
 */
export const ordersFunnelSchema = z.object({
  stages: z.array(
    z.object({ status: z.string(), count: z.number(), amount: z.number(), pct_of_created: z.number() }),
  ),
  transitions: z.object({
    pending_to_confirmed: z.number(),
    confirmed_to_shipping: z.number(),
    shipping_to_delivered: z.number(),
  }),
  cancelled: cohortShareSchema,
  in_progress: cohortShareSchema,
});
export type OrdersFunnel = Camelized<z.infer<typeof ordersFunnelSchema>>;

/** Ekran ishlatadigan `by` qiymatlari (shartnomada yana `created_by_kind`, `filial`, `payment_method`, `cancelled_by` bor). */
export const BREAKDOWN_DIMENSIONS = ["source", "region", "cancel_reason", "confirmation_channel"] as const;
export type BreakdownDimension = (typeof BREAKDOWN_DIMENSIONS)[number];

/** `GET /orders/breakdown/?by=`. */
export const ordersBreakdownSchema = z.array(
  z.object({
    key: z.string(),
    label: z.string(),
    count: z.number(),
    amount: z.number(),
    share_pct: z.number(),
    delivered: z.number(),
    cancelled: z.number(),
    previous_count: z.number().nullable(),
  }),
);
export type BreakdownRow = Camelized<z.infer<typeof ordersBreakdownSchema>>[number];

/** `GET /orders/stage-durations/` — daqiqalarda. */
export const stageDurationsSchema = z.array(
  z.object({
    stage: z.string(),
    /** Bosqichdan o'tgan buyurtma bo'lmasa `null`. */
    p50_min: z.number().nullable(),
    avg_min: z.number().nullable(),
    p90_min: z.number().nullable(),
    target_min: z.number(),
    previous_p50_min: z.number().nullable(),
  }),
);
export type StageDuration = Camelized<z.infer<typeof stageDurationsSchema>>[number];

/** `GET /orders/heatmap/` — `weekday` 1 (dushanba) … 7 (yakshanba), `hour` 0…23. */
export const ordersHeatmapSchema = z.array(
  z.object({ weekday: z.number(), hour: z.number(), count: z.number() }),
);
export type HeatmapCell = Camelized<z.infer<typeof ordersHeatmapSchema>>[number];

/**
 * `GET /orders/stuck/` — hozirgi holat. Shartnomada massiv; sarlavhadagi umumiy
 * son uchun `{count, results}` ga o'ralgan (jadval faqat eng eskilarini ko'rsatadi).
 */
export const stuckOrdersSchema = z.object({
  count: z.number(),
  results: z.array(
    z.object({
      id: z.string(),
      order_number: z.string(),
      status: z.string(),
      since: z.string(),
      hours_in_status: z.number(),
      amount: z.number(),
      filial: z.string().nullable(),
      operator: z.string().nullable(),
      courier: z.string().nullable(),
      lead_name: z.string().nullable(),
      rule: z.string(),
    }),
  ),
});
export type StuckOrders = Camelized<z.infer<typeof stuckOrdersSchema>>;
export type StuckOrder = StuckOrders["results"][number];

/* ---------- platforma `Order` modeli (`mehrigiyo_platform_tz/02` §5–§6) ---------- */

const paymentSchema = z.object({
  method: z.string().nullable(),
  status: z.string(),
  /** To'lov hali qabul qilinmagan bo'lsa `null`. */
  paid_amount: z.number().nullable(),
});
const clientSchema = z.object({ full_name: z.string(), phones: z.array(z.string()), has_app: z.boolean() });
const regionSchema = z.object({ region: z.string().nullable(), region_display: z.string().nullable() });

/** Ro'yxat qatori — `Order` ning qisqa shakli. */
export const orderRowSchema = z.object({
  id: z.string(),
  order_number: z.string(),
  status: z.string(),
  payment: paymentSchema.pick({ method: true, status: true }),
  client: clientSchema,
  source: z.string(),
  delivery: regionSchema,
  payable_amount: z.number(),
  created_at: z.string(),
});
export type OrderRow = Camelized<z.infer<typeof orderRowSchema>>;

/** `GET /orders/` — konvertsiz, sahifalangan ro'yxat. */
export const ordersListSchema = z.object({ count: z.number(), results: z.array(orderRowSchema) });
export type OrdersList = Camelized<z.infer<typeof ordersListSchema>>;

const timelineEventSchema = z.object({
  id: z.number(),
  kind: z.string(),
  actor: z.object({ type: z.string(), name: z.string().nullable() }),
  payload: z.record(z.unknown()).default({}),
  created_at: z.string(),
});

/** `GET /orders/{id}/` — to'liq buyurtma + tarix lentasi (faqat o'qish). */
export const orderDetailSchema = z.object({
  id: z.string(),
  order_number: z.string(),
  status: z.string(),
  pending_reason: z.string().nullable(),
  payment: paymentSchema,
  client: clientSchema,
  source: z.string(),
  /** Ilova yoki tizim yaratgan buyurtmada ism yo'q — `name: null`. */
  created_by: z.object({ kind: z.string(), name: z.string().nullable() }),
  /** Ilova/shifokor buyurtmasida operator yo'q — maydon kelmasligi ham mumkin. */
  responsible_operator: z.object({ name: z.string() }).nullable().default(null),
  items: z.array(
    z.object({
      /** Backend raqam yoki satr (`uuid`) qaytaradi — kalit sifatida satrga keltiriladi. */
      id: z.union([z.number(), z.string()]).transform(String),
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
      is_gift: z.boolean(),
    }),
  ),
  total_amount: z.number(),
  payable_amount: z.number(),
  delivery: regionSchema.extend({
    address_text: z.string().nullable(),
    courier: z.object({ full_name: z.string() }).nullable(),
    delivery_date: z.string().nullable(),
  }),
  filial: z.object({ name: z.string() }),
  created_at: z.string(),
  timeline: z.array(timelineEventSchema),
});
export type OrderDetail = Camelized<z.infer<typeof orderDetailSchema>>;
export type TimelineEvent = OrderDetail["timeline"][number];
