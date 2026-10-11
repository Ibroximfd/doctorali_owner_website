import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/** Hisobot va eksport (`02_BACKEND_TZ` §8). */

export const REPORT_KINDS = [
  "daily",
  "weekly",
  "monthly_pl",
  "operators",
  "couriers_cod",
  "debts",
  "products",
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const EXPORT_FORMATS = ["xlsx", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** Eksport davri: API presetlari (`custom` siz — oraliq bu sahifada tanlanmaydi). */
export const EXPORT_PERIODS = ["today", "yesterday", "7d", "30d", "month", "prev_month", "year"] as const;
export type ExportPeriod = (typeof EXPORT_PERIODS)[number];

/** `POST /reports/export/` tanasi. `filial` — id (vergul bilan bir nechta); berilmasa barcha filiallar. */
export type ExportRequest = {
  report: ReportKind;
  format: ExportFormat;
  period: ExportPeriod;
  filial?: string;
};

/** `POST /reports/export/` javobi: backend `id` qaytaradi (eski shartnomada `job_id`) — ikkalasi qabul qilinadi. */
export const exportCreatedSchema = z
  .union([z.object({ job_id: z.coerce.string() }), z.object({ id: z.coerce.string() })])
  .transform((created) => ({ job_id: "job_id" in created ? created.job_id : created.id }));

/** `GET /reports/export/{job_id}/`. Holat ochiq ro'yxat — noma'lum qiymat yiqitmaydi. */
export const exportStatusSchema = z.object({
  status: z.string(),
  url: z.string().nullable(),
  expires_at: z.string().nullable(),
});
export type ExportStatus = Camelized<z.infer<typeof exportStatusSchema>>;

/** `GET /reports/exports/` — eksport tarixi (shartnomaga qo'shimcha: ro'yxat endpointi). */
export const exportJobSchema = exportStatusSchema.extend({
  job_id: z.coerce.string(),
  report: z.string(),
  format: z.string(),
  date_from: z.string(),
  date_to: z.string(),
  /** Filial nomi; `null` — barcha filiallar. */
  filial: z.string().nullable(),
  created_at: z.string(),
});
export type ExportJob = Camelized<z.infer<typeof exportJobSchema>>;

export const exportsResponseSchema = z.object({ results: z.array(exportJobSchema) });

/** Xulosa xabarining raqamlari (shartnomaga qo'shimcha: `digest.preview`). */
export const digestPreviewSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  revenue_delta_pct: z.number().nullable(),
  orders: z.number(),
  delivered: z.number(),
  cancelled: z.number(),
  clinic_revenue: z.number(),
  clinic_visits: z.number(),
  courier_cod: z.number(),
  alerts_open: z.number(),
  alerts_critical: z.number(),
});
export type DigestPreview = Camelized<z.infer<typeof digestPreviewSchema>>;

/** `GET/PUT /reports/digest/` — Telegram kunlik xulosa sozlamasi. */
export const digestSchema = z.object({
  enabled: z.boolean(),
  time: z.string(),
  channels: z.array(z.string()).default([]),
  telegram_chat_id: z.union([z.string(), z.number()]).nullable().default(null),
  sections: z.array(z.string()).default([]),
  preview: digestPreviewSchema.nullable().default(null),
});
export type Digest = Camelized<z.infer<typeof digestSchema>>;
export type DigestSettings = Omit<Digest, "preview">;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Yuborish vaqti formasi (`SS:DD`, 24 soatlik). Xato matni — tarjima kaliti (`reports.digest.errors.*`). */
/**
 * Telefon klaviaturasida «:» bo'lmasligi mumkin: `0830`, `830`, `8:30` → `08:30`.
 */
export const normalizeTime = (raw: string): string => {
  const value = raw.trim().replace(/[.\s]/g, ":");
  const digits = /^(\d{1,2}):?(\d{2})$/.exec(value);
  return digits ? `${(digits[1] ?? "").padStart(2, "0")}:${digits[2] ?? ""}` : value;
};

export const digestTimeSchema = z.object({
  time: z.string().transform(normalizeTime).pipe(z.string().regex(TIME_PATTERN, "timeInvalid")),
});
export type DigestTimeInput = z.infer<typeof digestTimeSchema>;
