import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { metricSchema } from "@/shared/lib/envelope";

/** `GET /app/summary/` (`02_BACKEND_TZ` §4.8). */
export const appSummarySchema = z.object({
  users_total: metricSchema,
  new_users: metricSchema,
  active_users: metricSchema,
  app_order_share: metricSchema,
  consultations: metricSchema,
  push_enabled_rate: metricSchema,
  /** Shartnomaga qo'shimcha: "kunlik o'rtacha" izohi uchun. Kelmasa izoh chizilmaydi. */
  avg_daily_active_users: z.number().nullable().default(null),
  /** Shartnomaga qo'shimcha (ixtiyoriy): KPI kataklaridagi mini trendlar. */
  sparklines: z.record(z.array(z.number())).default({}),
});
export type AppSummary = Camelized<z.infer<typeof appSummarySchema>>;

/** `GET /app/timeseries/?metric=` — har o'lchov alohida so'raladi (shkalalari har xil). */
export const APP_TIMESERIES_METRICS = ["active_users", "new_users"] as const;
export type AppTimeseriesMetric = (typeof APP_TIMESERIES_METRICS)[number];

const shareRowSchema = z.object({ key: z.string(), users: z.number(), share_pct: z.number() });

/** `GET /app/devices/` — foydalanuvchilar platforma, versiya, til va bozor bo'yicha. */
export const appDevicesSchema = z.object({
  platform: z.array(shareRowSchema),
  versions: z.array(
    z.object({ version: z.string(), users: z.number(), share_pct: z.number(), is_latest: z.boolean() }),
  ),
  langs: z.array(shareRowSchema),
  markets: z.array(shareRowSchema),
});
export type AppDevices = Camelized<z.infer<typeof appDevicesSchema>>;

/**
 * `GET /app/consultations/`. Shartnomadagi `cancel_reasons` va `top_doctors`
 * prototipda ko'rsatilmaydi — shuning uchun bu yerda tekshirilmaydi ham.
 */
export const appConsultationsSchema = z.object({
  created: z.number(),
  paid: z.number(),
  completed: z.number(),
  cancelled: z.number(),
  revenue: z.number(),
  avg_rating: z.number().nullable(),
  /** Shartnomaga qo'shimcha: "N ta baho" izohi. Kelmasa izoh chizilmaydi. */
  rating_count: z.number().nullable().default(null),
});
export type AppConsultations = Camelized<z.infer<typeof appConsultationsSchema>>;

/** Hali yig'ilmayotgan ko'rsatkich `null` (yoki umuman yo'q) keladi — UI "ma'lumot yo'q" deydi. */
const optionalMetricSchema = metricSchema.nullable().default(null);

/** `GET /app/engagement/` — ilova imkoniyatlaridan foydalanish. */
export const appEngagementSchema = z.object({
  ai_doctor_conversations: optionalMetricSchema,
  health_active_users: optionalMetricSchema,
  stream_viewers: optionalMetricSchema,
  food_scans: optionalMetricSchema,
  med_reminders_active: optionalMetricSchema,
  referrals: optionalMetricSchema,
});
export type AppEngagement = Camelized<z.infer<typeof appEngagementSchema>>;

/** `GET /app/loyalty/` — ball (keshbek) va sovg'alar. */
export const appLoyaltySchema = z.object({
  points_issued: z.number(),
  points_spent: z.number(),
  points_expired: z.number(),
  wallet_balance_total: z.number(),
  /** Shartnomaga qo'shimcha: qoldiqning so'mdagi ekvivalenti (`finance/liabilities` dagi `uzs_equivalent` kabi). */
  wallet_balance_uzs: z.number().nullable().default(null),
  gifts_earned: z.number(),
  gifts_delivered: z.number(),
});
export type AppLoyalty = Camelized<z.infer<typeof appLoyaltySchema>>;

/** `GET /app/doctor-app/` — «Doctor Ali Pro» (shifokorlar ilovasi). */
export const doctorAppSchema = z.object({
  active_doctors: z.number(),
  orders_created: z.number(),
  orders_amount: z.number(),
  consultations_completed: z.number(),
});
export type DoctorApp = Camelized<z.infer<typeof doctorAppSchema>>;

/** `GET /orders/app-funnels/` (§4.3) — ilovadagi tasdiqlash va bekor qilish oqimlari. */
export const appFunnelsSchema = z.object({
  confirm: z.object({
    push_sent: z.number(),
    /** Ilova bu bosqichlarni hali yubormasa `null`. */
    opened: z.number().nullable(),
    slid: z.number().nullable(),
    payment_selected: z.number(),
    confirmed: z.number(),
  }),
  cancel: z.object({
    step1: z.number(),
    step2_kept: z.number(),
    step2_continued: z.number(),
    step3_cancelled: z.number(),
  }),
});
export type AppFunnels = Camelized<z.infer<typeof appFunnelsSchema>>;
