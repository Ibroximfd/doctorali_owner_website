import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { metricSchema, timeseriesSchema } from "@/shared/lib/envelope";

/**
 * `GET /sales/summary/` (`02_BACKEND_TZ` §4.7). Hammasi `Metric`; "hozir"
 * ko'rsatkichlari (`calls_missed_unhandled`, `activities_overdue`) davrga
 * bog'liq emas — ularda `previous`/`delta_pct` har doim `null`.
 */
export const salesSummarySchema = z.object({
  leads: metricSchema,
  conversion: metricSchema,
  sales_amount: metricSchema,
  calls_total: metricSchema,
  calls_missed_unhandled: metricSchema,
  activities_overdue: metricSchema,
  avg_rating: metricSchema,
  /** Shartnomaga qo'shimcha: KPI kataklaridagi mini trend (`overview` dagidek). */
  sparklines: z.record(z.array(z.number())).default({}),
});
export type SalesSummary = Camelized<z.infer<typeof salesSummarySchema>>;

const operatorSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  filial: z.string().nullable(),
  is_online: z.boolean(),
  leads: z.number(),
  conversion_pct: z.number(),
  orders_created: z.number(),
  orders_delivered: z.number(),
  sales_amount: z.number(),
  commission_earned: z.number(),
  commission_pending: z.number(),
  calls: z.number(),
  missed_unhandled: z.number(),
  activities_overdue: z.number(),
  /** Hali baholanmagan operatorda `null`. */
  rating_avg: z.number().nullable(),
  rating_count: z.number(),
});

/** `GET /sales/operators/` — tanlangan filiallar operatorlari. */
export const operatorsSchema = z.array(operatorSchema);
export type Operator = Camelized<z.infer<typeof operatorSchema>>;

/**
 * `GET /sales/operators/{id}/` — ro'yxatdagi maydonlar + kunlik trend
 * (`orders_delivered` seriyasi). Shartnomadagi "lid statuslari" bu ekranda
 * ko'rsatilmaydi, shuning uchun o'qilmaydi.
 */
export const operatorDetailSchema = operatorSchema.extend({ trend: timeseriesSchema });
export type OperatorDetail = Camelized<z.infer<typeof operatorDetailSchema>>;

/** `GET /sales/leads-funnel/`. `kind` — `initial · intermediate · success · fail` (noma'lumi neytral rangda). */
export const leadsFunnelSchema = z.array(
  z.object({
    status_id: z.number(),
    name: z.string(),
    kind: z.string(),
    count: z.number(),
    share_pct: z.number(),
  }),
);
export type LeadStatus = Camelized<z.infer<typeof leadsFunnelSchema>>[number];

/** `GET /sales/lead-sources/`. */
export const leadSourcesSchema = z.array(
  z.object({
    source: z.string(),
    leads: z.number(),
    converted: z.number(),
    conversion_pct: z.number(),
    sales_amount: z.number(),
  }),
);
export type LeadSource = Camelized<z.infer<typeof leadSourcesSchema>>[number];

/**
 * `GET /sales/calls/` — `answered` va `missed` vaqt qatori + o'rtacha davomiylik.
 * Shartnomadagi `missed_reasons` shakli belgilanmagan va ekranda yo'q — o'qilmaydi.
 */
/** `avg_duration_sec` — davrda javob berilgan qo'ng'iroq bo'lmasa `null`. */
export const salesCallsSchema = timeseriesSchema.extend({ avg_duration_sec: z.number().nullable() });
export type SalesCalls = Camelized<z.infer<typeof salesCallsSchema>>;

/** `GET /sales/ratings/`. `distribution` kalitlari — yulduzlar soni (`"1"`…`"5"`). */
export const salesRatingsSchema = z.object({
  avg: z.number().nullable(),
  count: z.number(),
  distribution: z.record(z.number()),
  low: z.array(
    z.object({
      stars: z.number(),
      comment: z.string().nullable(),
      operator: z.string(),
      client: z.string(),
      at: z.string(),
    }),
  ),
});
export type SalesRatings = Camelized<z.infer<typeof salesRatingsSchema>>;
export type LowRating = SalesRatings["low"][number];

const salesFilialSchema = z.object({
  id: z.number(),
  name: z.string(),
  /** Filial admini (operatorlar rahbari); tayinlanmagan bo'lsa `null`. */
  admin_name: z.string().nullable(),
  operators_total: z.number(),
  operators_online: z.number(),
  leads: z.number(),
  conversion_pct: z.number(),
  orders_delivered: z.number(),
  sales_amount: metricSchema,
  /** Filiallar hajmi turlicha — adolatli taqqoslash uchun bir operatorga to'g'ri keladigan sotuv. */
  sales_per_operator: z.number(),
  commission_earned: z.number(),
  calls: z.number(),
  missed_unhandled: z.number(),
  activities_overdue: z.number(),
  rating_avg: z.number().nullable(),
  rating_count: z.number(),
  /** Joriy oy rejasi (yetkazib berish kanali); filialga reja kiritilmagan bo'lsa `null`. */
  plan: z.object({ target: z.number(), actual: z.number(), pct: z.number() }).nullable(),
});

/**
 * `GET /sales/filials/` — operator jamoalari filial kesimida. Filial filtri
 * qo'llanmaydi: taqqoslash uchun har doim barcha filiallar qaytadi.
 */
export const salesFilialsSchema = z.array(salesFilialSchema);
export type SalesFilial = Camelized<z.infer<typeof salesFilialSchema>>;

/** `GET /sales/filials/timeseries/` — operatorlar sotuvi; har seriya — bitta filial (`key` = filial `id`). */
export const salesFilialsTrendSchema = timeseriesSchema;
export type SalesFilialsTrend = Camelized<z.infer<typeof salesFilialsTrendSchema>>;
