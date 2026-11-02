import type { AiMessage, AiMessagesPage, Analysis, Finding } from "./ai.schema";

/** Hujjatdagi tartib: `urgent → attention → good` (§8.2). Noma'lum daraja oxirida. */
export const SEVERITIES = ["urgent", "attention", "good"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const severityRank = (severity: string): number => {
  const index = SEVERITIES.findIndex((known) => known === severity);
  return index === -1 ? SEVERITIES.length : index;
};

/**
 * TZ shaklida `severity` faqat `attention | good`; asl daraja `source_severity` da (sklad
 * qoidalaridan `urgent` ham keladi) — shoshilinch topilma shoshilinch bo'lib ko'rinsin.
 */
export const effectiveSeverity = (finding: Pick<Finding, "severity" | "source_severity">): string =>
  finding.source_severity === "urgent" ? "urgent" : finding.severity;

export const groupBySeverity = (findings: readonly Finding[]) =>
  [...SEVERITIES, "other" as const]
    .map((severity) => ({
      severity,
      items: findings.filter((finding) => {
        const level = effectiveSeverity(finding);
        return severity === "other" ? severityRank(level) === SEVERITIES.length : level === severity;
      }),
    }))
    .filter((group) => group.items.length > 0);

const text = (finding: Finding, keys: readonly string[]): string | null => {
  for (const key of keys) {
    const value = finding[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
};

/**
 * Rus tilida avval `<kalit>_ru` (N-10: `title_ru`, `detail_ru`); bo'sh yoki yo'q bo'lsa —
 * asl (o'zbekcha) matn. Sklad topilmalarida tarjima manbasi yo'q — o'zbekcha qoladi.
 */
const localized = (finding: Finding, locale: string, keys: readonly string[]): string | null =>
  (locale === "ru"
    ? text(
        finding,
        keys.map((key) => `${key}_ru`),
      )
    : null) ?? text(finding, keys);

/** Topilma sarlavhasi, izohi va maslahati (`title`, `detail`; sklad topilmasida `fix`). */
export const findingTitle = (finding: Finding, locale = "uz"): string =>
  localized(finding, locale, ["title", "message", "summary", "text", "kind", "code"]) ?? finding.severity;
export const findingDetail = (finding: Finding, locale = "uz"): string | null =>
  localized(finding, locale, ["detail", "description", "details", "explanation"]);
export const findingAdvice = (finding: Finding): string | null =>
  text(finding, ["recommendation", "fix", "advice", "action"]);

export const countBySeverity = (findings: readonly Finding[], severity: Severity): number =>
  findings.filter((finding) => effectiveSeverity(finding) === severity).length;

/** Topilma kimga tegishli: `logistics` → B.L, `sales` → B.O; notanish — `null`. */
export const OWNER_ROLES = ["logistics", "sales"] as const;
export type OwnerRole = (typeof OWNER_ROLES)[number];
export const ownerRoleOf = (value: unknown): OwnerRole | null =>
  (OWNER_ROLES as readonly unknown[]).includes(value) ? (value as OwnerRole) : null;

/** AI xulosasi joriy tilda: rus tilida `summary_ru`, bo'lmasa asl matn; kalitsiz — `null`. */
export const analysisSummary = (analysis: Pick<Analysis, "summary" | "summaryRu">, locale: string) =>
  (locale === "ru" ? analysis.summaryRu : null) ?? analysis.summary;

/** `ai_summary` — 5–8 bandli matn: qatorlarga bo'linadi, bo'shlari tashlanadi. */
export const summaryLines = (summary: string | null): string[] =>
  (summary ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").trim())
    .filter(Boolean);

/**
 * AI xulosa blokining holati: kalit yo'q (`ai_available: false`) — topilmalar kod bilan
 * hisoblangan; hali yangilanmagan (`empty`) — «Yangilash» kerak; xulosa bor — ko'rsatiladi.
 */
export type SummaryState = "summary" | "noKey" | "notRefreshed" | "noSummary";
export const summaryState = (analysis: Analysis, locale: string): SummaryState => {
  if (summaryLines(analysisSummary(analysis, locale)).length > 0) return "summary";
  if (analysis.aiAvailable === false) return "noKey";
  if (analysis.status === "empty") return "notRefreshed";
  return "noSummary";
};

/** «Yangilash» xatosi → tushunarli gap (kod bo'yicha, `detail` matniga qaralmaydi). */
export type RefreshFailure = "running" | "noKey" | "rateLimited" | "invalid" | "offline" | "failed";
export const refreshFailure = (error: { code?: string; kind: string }): RefreshFailure => {
  if (error.code === "analysis_running") return "running";
  if (error.code === "ai_unavailable") return "noKey";
  if (error.code === "rate_limited" || error.kind === "rate-limited") return "rateLimited";
  if (error.code === "validation_error") return "invalid";
  return error.kind === "offline" ? "offline" : "failed";
};

/** Chat xatosi → tushunarli gap (§I-3). */
export type ChatFailure =
  "rateLimited" | "unavailable" | "refused" | "invalid" | "notFound" | "offline" | "failed";
export const chatFailure = (error: { code?: string; kind: string }): ChatFailure => {
  if (error.code === "ai_unavailable") return "unavailable";
  if (error.code === "ai_refused") return "refused";
  if (error.code === "chat_not_found") return "notFound";
  if (error.code === "validation_error") return "invalid";
  if (error.code === "rate_limited" || error.code === "too_many_attempts" || error.kind === "rate-limited")
    return "rateLimited";
  return error.kind === "offline" ? "offline" : "failed";
};

/** Loyiha amali xatosi (§C-2): allaqachon yuborilgan / rad etilgan — ro'yxat eskirgan. */
export type DraftFailure = "alreadySent" | "discarded" | "notFound" | "noChannel" | "failed";
export const draftFailure = (error: { code?: string }): DraftFailure => {
  if (error.code === "draft_already_sent") return "alreadySent";
  if (error.code === "draft_discarded") return "discarded";
  if (error.code === "draft_not_found") return "notFound";
  if (error.code === "chat_not_found") return "noChannel";
  return "failed";
};

/**
 * Yuqoriga yuklangan sahifalar (har biri eski xabarlar) bitta xronologik ro'yxatga: oxirgi
 * yuklangan sahifa — eng eski. Takror `id` bir marta.
 */
export const mergeMessagePages = (pages: readonly Pick<AiMessagesPage, "messages">[]): AiMessage[] => {
  const seen = new Set<number>();
  return [...pages]
    .reverse()
    .flatMap((page) => page.messages)
    .filter((message) => (seen.has(message.id) ? false : (seen.add(message.id), true)))
    .sort((a, b) => a.id - b.id);
};

/** Oy `YYYY-MM` — `n` oy oldingi (0 — joriy). */
export const shiftMonth = (month: string, by: number): string => {
  const [year = 1970, value = 1] = month.split("-").map(Number);
  const index = year * 12 + (value - 1) + by;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
};

/** Yangi suhbat xabari: 2–4000 belgi (§I-3). */
export const MESSAGE_MIN = 2;
export const MESSAGE_MAX = 4000;

/** ESKI `ai/chat/` savoli: 3–1000 belgi. */
export const QUESTION_MIN = 3;
export const QUESTION_MAX = 1000;
