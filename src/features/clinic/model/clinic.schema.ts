import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { metricSchema, nullableMetricSchema } from "@/shared/lib/envelope";

/**
 * `GET /clinic/summary/` (`02_BACKEND_TZ` §4.5). `visit_purposes` shartnomada
 * shakli berilmagan va ekranda ishlatilmaydi — shuning uchun tekshirilmaydi.
 */
export const clinicSummarySchema = z.object({
  revenue: metricSchema,
  visits_arrived: metricSchema,
  /** Tashrif rejalashtirilmagan bo'lsa `null`. */
  no_show_rate: nullableMetricSchema,
  treatments: metricSchema,
  consultations: metricSchema,
  /** Tashrif yozilmagan bo'lsa `null`. */
  avg_check: nullableMetricSchema,
  new_clients: metricSchema,
  returning_clients: metricSchema,
  revenue_mix: z.object({ products: z.number(), treatments: z.number(), consultations: z.number() }),
  visits: z.object({
    scheduled: z.number(),
    arrived: z.number(),
    no_show: z.number(),
    cancelled: z.number(),
  }),
  /** KPI kataklaridagi mini trendlar (kalit — ko'rsatkich nomi). */
  sparklines: z.record(z.array(z.number())).default({}),
});
export type ClinicSummary = Camelized<z.infer<typeof clinicSummarySchema>>;

/** `GET /clinic/branches/` — filial bo'yicha qatorlar. */
/** Filialda klinika bo'lmasa raqamli ustunlar `null` (`API_QOLLANMA` §8). */
export const clinicBranchesSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    revenue: z.number().nullable(),
    visits_arrived: z.number().nullable(),
    no_show_rate: z.number().nullable(),
    tills: z.number().nullable(),
    open_debt: z.number().nullable(),
    stock_value: z.number().nullable(),
    /** Kechagi kassa yopilishi: `closed | open | reopened` (noma'lum qiymat yiqitmaydi). */
    closing_status: z.string().nullable(),
    /** Yopilishdagi farq, so'm: manfiy — kamomad, musbat — ortiqcha. */
    closing_difference: z.number().nullable(),
    attendance_rate: z.number().nullable(),
  }),
);
export type ClinicBranch = Camelized<z.infer<typeof clinicBranchesSchema>>[number];

/** `GET /clinic/doctors/`. */
export const clinicDoctorsSchema = z.array(
  z.object({
    doctor: z.string(),
    specialty: z.string(),
    filial: z.string(),
    visits: z.number(),
    treatments_revenue: z.number(),
    sales_revenue: z.number(),
    commission_earned: z.number(),
    payout_outstanding: z.number(),
  }),
);
export type ClinicDoctor = Camelized<z.infer<typeof clinicDoctorsSchema>>[number];

/** `GET /clinic/warehouse/` — klinika do'koni qoldiqlari (hozirgi holat). */
export const clinicWarehouseSchema = z.object({
  stock_value: z.number(),
  sku_count: z.number(),
  low: z.array(
    z.object({ product: z.string(), quantity: z.number(), min_quantity: z.number(), filial: z.string() }),
  ),
  out: z.array(z.object({ product: z.string(), filial: z.string() })),
  received_month: z.number(),
  written_off_month: z.number(),
  last_count: z.object({ date: z.string(), shortage: z.number(), surplus: z.number() }).nullable(),
});
export type ClinicWarehouse = Camelized<z.infer<typeof clinicWarehouseSchema>>;
