import { camelKey } from "@/shared/lib/camelize";

/** Tuzilma v2: filiallardagi operatorlar va logistlar (kuryerlar — umumiy dostavkada, bosh kuryer saytida). */
export const STAFF_ROLES = ["operator", "logist"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export const isStaffRole = (value: string): value is StaffRole =>
  STAFF_ROLES.some((known) => known === value);

export const STAFF_BADGES = [
  "top_conversion",
  "most_improved",
  "fastest",
  "best_rated",
  "needs_attention",
] as const;
export type StaffBadge = (typeof STAFF_BADGES)[number];
export const isStaffBadge = (value: string): value is StaffBadge =>
  STAFF_BADGES.some((known) => known === value);

/** Ustun kaliti (`conversion_pct`) bo'yicha qiymat — `metrics` chegarada camelCase bo'lgan. */
export const metricValue = (metrics: Record<string, number | null>, key: string): number | null =>
  metrics[camelKey(key)] ?? null;

/** Ball rangi: 80+ — yaxshi, 60+ — o'rta, qolgani — e'tibor. */
export type ScoreTone = "good" | "warn" | "crit";
export const scoreTone = (score: number): ScoreTone => {
  if (score >= 80) return "good";
  return score >= 60 ? "warn" : "crit";
};

/** Jamoa o'rtachasidan farq: yaxshi tomonga — musbat (ko'rsatkich «kamroq yaxshi» bo'lsa teskari). */
export const versusTeam = (
  value: number | null,
  average: number | null,
  better: "higher" | "lower",
): number | null => {
  if (value === null || average === null || average === 0) return null;
  const diff = ((value - average) / Math.abs(average)) * 100;
  return Math.round((better === "higher" ? diff : -diff) * 10) / 10;
};

/** Reyting tartibi: ballsizlar (ma'lumot yetarli emas) oxirida. */
export const sortByRank = <Row extends { rank: number; score: number | null }>(rows: readonly Row[]): Row[] =>
  [...rows].sort((a, b) => Number(a.score === null) - Number(b.score === null) || a.rank - b.rank);

/**
 * Asosiy ko'rsatkich (chiziq bilan chiziladigan): reyting tartibi qaysi ustun bo'yicha bo'lsa
 * (sotuv summasi — `uzs`), o'sha; bo'lmasa «ko'proq — yaxshi» bo'lgan birinchi foiz ustuni.
 */
export const leadColumn = <Column extends { unit: string; better: "higher" | "lower" }>(
  columns: readonly Column[],
): Column | null =>
  columns.find((column) => column.unit === "uzs" && column.better === "higher") ??
  columns.find((column) => column.unit === "pct" && column.better === "higher") ??
  null;

/** Ko'rsatkich ustun o'rtachasiga nisbatan: yaxshi · oddiy · e'tibor · yomon. */
export type RelativeTone = "good" | "neutral" | "warn" | "crit";
export const relativeTone = (
  value: number | null,
  average: number | null,
  better: "higher" | "lower",
): RelativeTone => {
  if (value === null || average === null || average === 0) return "neutral";
  const ratio = better === "lower" ? value / average : average / Math.max(value, Number.EPSILON);
  if (ratio <= 0.8) return "good";
  if (ratio <= 1.2) return "neutral";
  return ratio <= 1.6 ? "warn" : "crit";
};

/** Ustun bo'yicha o'rtacha (qiymati bor qatorlar). */
export const columnAverage = (rows: readonly { metrics: Record<string, number | null> }[], key: string) => {
  const values = rows.map((row) => metricValue(row.metrics, key)).filter((value) => value !== null);
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
};

/** Orqada qolayotgan xodim: ball «e'tibor» zonasida yoki backend shunday belgilagan. */
/**
 * «E'tibor kerak» — faqat backend belgisi (`needs_attention`). «Yetakchiga nisbatan» ulush past
 * bo'lishi o'zi muammo emas (kichik filialda sotuv kam bo'ladi) — qizil bilan belgilanmaydi.
 */
export const isLagging = (row: { badges: readonly string[] }): boolean =>
  row.badges.includes("needs_attention");

/**
 * Bo'lim boshidagi jumla uchun: yetakchi va uning asosiy ko'rsatkichi jamoa o'rtachasidan necha barobar.
 * Kamida 2 ta qiymatli qator va musbat o'rtacha bo'lmasa, yoki yetakchi o'rtachadan yuqori
 * bo'lmasa (masalan uning qiymati 0) — `null`: «0,0 marta yuqori» kabi ma'nosiz jumla chiqmaydi.
 */
export const leaderInsight = <
  Row extends {
    fullName: string;
    rank: number;
    score: number | null;
    metrics: Record<string, number | null>;
  },
>(
  rows: readonly Row[],
  key: string,
): { leader: Row; value: number; ratio: number } | null => {
  const ranked = sortByRank(rows).filter(
    (row) => row.score !== null && metricValue(row.metrics, key) !== null,
  );
  const [leader] = ranked;
  const value = leader ? metricValue(leader.metrics, key) : null;
  const average = columnAverage(ranked, key);
  if (!leader || value === null || ranked.length < 2 || average === null || average <= 0) return null;
  const ratio = Math.round((value / average) * 10) / 10;
  return value > 0 && ratio > 1 ? { leader, value, ratio } : null;
};
