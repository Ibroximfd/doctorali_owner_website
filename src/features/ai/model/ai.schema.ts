import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/**
 * Owner AI — backend v2 §8: `status/`, `analysis/`, `chat/`. Topilma (B-9, jonli javob
 * 2026-10-31): `{kind, title, detail, severity}`; sklad topilmasi qo'shimcha `id`, `area`, `fix`,
 * `link` beradi — `passthrough` bilan saqlanadi.
 */

/** Davr: jonli javobda `{from, to}`, hujjatda `{date_from, date_to}` — ikkalasi ham. */
const periodSchema = z.preprocess(
  (raw) =>
    typeof raw === "object" && raw !== null && "from" in raw && !("date_from" in raw)
      ? { date_from: (raw as { from: unknown }).from, date_to: (raw as { to?: unknown }).to }
      : raw,
  z.object({ date_from: z.string(), date_to: z.string() }).nullable().default(null),
);

/** `GET /ai/status/` — `enabled: false` → chat yashiriladi, tahlil qoladi. */
export const aiStatusSchema = z.object({
  enabled: z.boolean(),
  model: z.string().nullable().default(null),
  cached_analysis_at: z.string().nullable().default(null),
});
export type AiStatus = Camelized<z.infer<typeof aiStatusSchema>>;

export const findingSchema = z
  .object({
    kind: z.string().optional(),
    title: z.string().optional(),
    detail: z.string().nullable().optional(),
    severity: z.string(),
  })
  .passthrough();
export type Finding = z.infer<typeof findingSchema>;

/** `GET /ai/analysis/` — `findings` deterministik, `ai_summary` kalitsiz muhitda `null`. */
export const analysisSchema = z.object({
  generated_at: z.string(),
  period: periodSchema,
  findings: z.array(findingSchema).default([]),
  ai_summary: z.string().nullable().default(null),
  model: z.string().nullable().default(null),
  warehouse_findings: z.array(findingSchema).default([]),
});

/**
 * Topilmalar ichidagi kalitlar backend nomi bilan qolishi uchun `camelize` qilinmaydi —
 * faqat yuqori darajadagi maydonlar camelCase.
 */
export type Analysis = {
  generatedAt: string;
  period: { dateFrom: string; dateTo: string } | null;
  findings: Finding[];
  aiSummary: string | null;
  model: string | null;
  warehouseFindings: Finding[];
};

/** `POST /ai/chat/`. */
export const chatAnswerSchema = z.object({
  answer: z.string(),
  model: z.string().nullable().default(null),
  tools_used: z.array(z.string()).default([]),
  period: periodSchema,
});
export type ChatAnswer = Camelized<z.infer<typeof chatAnswerSchema>>;
