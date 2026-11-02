import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/**
 * Owner AI — `API_QOLLANMA` §6.8 va TZ 32 §I, §C-2 (`TZ32_C_I_OWNER_CHAT_AI.md`): `status/`,
 * `analysis/` (GET saqlangan, POST «Yangilash»), `chats/*` (tarixli suhbatlar), `drafts/*`
 * (AI loyihalari — faqat tasdiq bilan yuboriladi), `usage/` (oylik xarajat).
 * Kalitsiz rejim: `ai_available: false`, topilmalar baribir keladi. Eski backend (prod) yangi
 * maydonlarni bermasa — sukut qiymatlar bilan o'qiladi.
 */

/** Davr: `{from, to}` yoki `{date_from, date_to}` — B-24 dan keyin ikkalasi birga keladi. */
const periodSchema = z.preprocess(
  (raw) =>
    typeof raw === "object" && raw !== null && "from" in raw && !("date_from" in raw)
      ? { date_from: (raw as { from: unknown }).from, date_to: (raw as { to?: unknown }).to }
      : raw,
  z.object({ date_from: z.string(), date_to: z.string() }).nullable().default(null),
);

/** Tahlil davri presetlari (§I-2); sukut — 30 kun. */
export const AI_PERIODS = ["7d", "14d", "30d", "60d", "90d"] as const;
export type AiPeriod = (typeof AI_PERIODS)[number];
export const DEFAULT_AI_PERIOD: AiPeriod = "30d";

/** `GET /ai/status/` — `enabled: false` → kalit qo'yilmagan. */
export const aiStatusSchema = z.object({
  enabled: z.boolean(),
  model: z.string().nullable().default(null),
  cached_analysis_at: z.string().nullable().default(null),
});
export type AiStatus = Camelized<z.infer<typeof aiStatusSchema>>;

/**
 * Topilma — kalitlari backend nomi bilan qoladi (`camelize` qilinmaydi). `owner_role`:
 * `logistics` (→ B.L) | `sales` (→ B.O); `source_severity` — asl daraja (`urgent` bo'lishi mumkin).
 */
export const findingSchema = z
  .object({
    kind: z.string().optional(),
    title: z.string().optional(),
    detail: z.string().nullable().optional(),
    title_ru: z.string().nullable().optional(),
    detail_ru: z.string().nullable().optional(),
    severity: z.string(),
    source_severity: z.string().nullable().optional(),
    owner_role: z.string().nullable().optional(),
    filial_id: z.number().nullable().optional(),
    metric: z.string().nullable().optional(),
  })
  .passthrough();
export type Finding = z.infer<typeof findingSchema>;

/** `ready` — saqlangan · `empty` — hali yangilanmagan · `running` — hisoblanmoqda. */
export const ANALYSIS_STATUSES = ["ready", "empty", "running"] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

/** Notanish yoki yo'q holat (eski backend) — `ready`: javobda nima bo'lsa o'sha ko'rsatiladi. */
const statusField = z.preprocess(
  (raw) => ((ANALYSIS_STATUSES as readonly unknown[]).includes(raw) ? raw : "ready"),
  z.enum(ANALYSIS_STATUSES),
);

/** `GET|POST /ai/analysis/` (§I-2). `findings` doim kod hisoblagan; AI matni — `summary*`. */
export const analysisSchema = z.object({
  status: statusField,
  period_key: z.string().nullable().default(null),
  generated_at: z.string().nullable().default(null),
  period: periodSchema,
  findings: z.array(findingSchema).default([]),
  summary: z.string().nullable().default(null),
  summary_ru: z.string().nullable().default(null),
  /** Eski nom — `summary` bilan ayni qiymat (orqaga moslik). */
  ai_summary: z.string().nullable().default(null),
  model: z.string().nullable().default(null),
  warehouse_findings: z.array(findingSchema).default([]),
  /** Serverda AI kaliti bormi; eski backend bermasa — `null` (noma'lum). */
  ai_available: z.boolean().nullable().default(null),
  ai_used: z.boolean().nullable().default(null),
});

export type Analysis = {
  status: AnalysisStatus;
  periodKey: string | null;
  generatedAt: string | null;
  period: { dateFrom: string; dateTo: string } | null;
  findings: Finding[];
  summary: string | null;
  summaryRu: string | null;
  model: string | null;
  warehouseFindings: Finding[];
  aiAvailable: boolean | null;
  aiUsed: boolean | null;
};

/** Topilmalar ichi `camelize` qilinmaydi — faqat yuqori darajadagi maydonlar. */
export const toAnalysis = (raw: z.infer<typeof analysisSchema>): Analysis => ({
  status: raw.status,
  periodKey: raw.period_key,
  generatedAt: raw.generated_at,
  period: raw.period ? { dateFrom: raw.period.date_from, dateTo: raw.period.date_to } : null,
  findings: raw.findings,
  summary: raw.summary ?? raw.ai_summary,
  summaryRu: raw.summary_ru,
  model: raw.model,
  warehouseFindings: raw.warehouse_findings,
  aiAvailable: raw.ai_available,
  aiUsed: raw.ai_used,
});

/** Ro'yxat: `{<kalit>: [...]}` yoki yalang' massiv — ikkalasi ham. */
const listOf = <Item extends z.ZodTypeAny>(key: string, item: Item) =>
  z.preprocess(
    (raw) =>
      typeof raw === "object" && raw !== null && !Array.isArray(raw) && key in raw
        ? (raw as Record<string, unknown>)[key]
        : raw,
    z.array(item),
  );

/** AI suhbati (§I-3). Sarlavha berilmasa birinchi savoldan olinadi — shungacha `null`. */
export const aiChatSchema = z.object({
  id: z.number(),
  title: z.string().nullable().default(null),
  message_count: z.number().default(0),
  last_message_at: z.string().nullable().default(null),
  created_at: z.string().nullable().default(null),
});
export type AiChat = Camelized<z.infer<typeof aiChatSchema>>;

export const aiChatsSchema = listOf("chats", aiChatSchema);

/** `POST /ai/chats/` → `{chat}` (yoki suhbatning o'zi). */
export const createdChatSchema = z.preprocess(
  (raw) => (typeof raw === "object" && raw !== null && "chat" in raw ? (raw as { chat: unknown }).chat : raw),
  aiChatSchema,
);

export const aiMessageSchema = z.object({
  id: z.number(),
  role: z.string(),
  text: z.string(),
  lang: z.string().nullable().default(null),
  model: z.string().nullable().default(null),
  tools_used: z.array(z.string()).default([]),
  created_at: z.string().nullable().default(null),
});
export type AiMessage = Camelized<z.infer<typeof aiMessageSchema>>;

/** `GET /ai/chats/{id}/messages/?before_id=&limit=` — kursor yuqoriga (eskilar). */
export const aiMessagesPageSchema = z.object({
  chat: aiChatSchema.nullable().default(null),
  has_more: z.boolean().default(false),
  oldest_id: z.number().nullable().default(null),
  messages: z.array(aiMessageSchema).default([]),
  ai_available: z.boolean().nullable().default(null),
});
export type AiMessagesPage = Camelized<z.infer<typeof aiMessagesPageSchema>>;

/** `POST /ai/chats/{id}/messages/` → 201 `{chat, message}` (assistent javobi). */
export const sentMessageSchema = z.object({
  chat: aiChatSchema.nullable().default(null),
  message: aiMessageSchema,
});

/** AI loyihasi (§C-2): `status` — `draft | sent | discarded`. */
export const DRAFT_STATUSES = ["draft", "sent", "discarded"] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const draftSchema = z.object({
  id: z.number(),
  filial: z.object({ id: z.number(), name: z.string() }).nullable().default(null),
  owner_role: z.string().nullable().default(null),
  text: z.string(),
  status: z.string(),
  created_at: z.string().nullable().default(null),
  sent_at: z.string().nullable().default(null),
  message_id: z.number().nullable().default(null),
});
export type AiDraft = Camelized<z.infer<typeof draftSchema>>;

export const draftsSchema = listOf("drafts", draftSchema);

/** `POST|DELETE …/send/` — natija ro'yxatni qayta so'rash bilan ko'rinadi, tana o'qilmaydi. */
export const draftActionSchema = z.unknown();

/** Pul — satr (`"1.414450"`); son kelsa ham satrga keltiriladi. */
const usd = z.preprocess((raw) => (typeof raw === "number" ? String(raw) : raw), z.string());

/** `GET /ai/usage/?month=` (§I-4). */
export const usageSchema = z.object({
  month: z.string(),
  model: z.string().nullable().default(null),
  currency: z.string().default("USD"),
  calls: z.number().default(0),
  input_tokens: z.number().default(0),
  output_tokens: z.number().default(0),
  cost_usd: usd.default("0"),
  by_kind: z
    .array(
      z.object({
        kind: z.string(),
        calls: z.number().default(0),
        input_tokens: z.number().default(0),
        output_tokens: z.number().default(0),
        cost_usd: usd.default("0"),
      }),
    )
    .default([]),
  limits: z
    .object({
      rate_per_min: z.number().nullable().default(null),
      max_tokens_chat: z.number().nullable().default(null),
      max_tokens_analysis: z.number().nullable().default(null),
    })
    .nullable()
    .default(null),
});
export type AiUsage = Camelized<z.infer<typeof usageSchema>>;

/** ESKI `POST /ai/chat/` (tarixsiz) — faqat `ai/chats/` backendda yo'q bo'lsa (prod) zaxira. */
export const chatAnswerSchema = z.object({
  answer: z.string(),
  model: z.string().nullable().default(null),
  tools_used: z.array(z.string()).default([]),
  period: periodSchema,
});
export type ChatAnswer = Camelized<z.infer<typeof chatAnswerSchema>>;
