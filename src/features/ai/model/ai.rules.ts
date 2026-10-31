import type { Finding } from "./ai.schema";

/** Hujjatdagi tartib: `urgent → attention → good` (§8.2). Noma'lum daraja oxirida. */
export const SEVERITIES = ["urgent", "attention", "good"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const severityRank = (severity: string): number => {
  const index = SEVERITIES.findIndex((known) => known === severity);
  return index === -1 ? SEVERITIES.length : index;
};

export const groupBySeverity = (findings: readonly Finding[]) =>
  [...SEVERITIES, "other" as const]
    .map((severity) => ({
      severity,
      items: findings.filter((finding) =>
        severity === "other"
          ? severityRank(finding.severity) === SEVERITIES.length
          : finding.severity === severity,
      ),
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
  findings.filter((finding) => finding.severity === severity).length;

/** `ai_summary` — 5–8 bandli matn: qatorlarga bo'linadi, bo'shlari tashlanadi. */
export const summaryLines = (summary: string | null): string[] =>
  (summary ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").trim())
    .filter(Boolean);

export const QUESTION_MIN = 3;
export const QUESTION_MAX = 1000;
