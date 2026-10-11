import { SEQ_BG, STATUS_COLORS, seriesColor } from "@/shared/config/chart-palette";
import { metricAmount } from "@/shared/lib/envelope";

import type { Operator, SalesCalls, SalesFilial } from "./sales.schema";

/** Shu sondan boshlab hal qilinmagan o'tkazib yuborilgan qo'ng'iroqlar "jiddiy" belgi oladi. */
export const MISSED_CALLS_SERIOUS = 5;
/** Shu sondan boshlab muddati o'tgan delalar ogohlantirish belgisi oladi. */
export const OVERDUE_ACTIVITIES_WARN = 9;
/** Shu ulushdan boshlab lid manbai "yaxshi aylanadi" deb yashil ko'rsatiladi. */
const HIGH_CONVERSION_PCT = 40;

/** Reyting — sotuv summasi bo'yicha, kattadan kichikka. */
export const rankOperators = (operators: readonly Operator[]): Operator[] =>
  [...operators].sort((a, b) => b.salesAmount - a.salesAmount);

/** Qiymatning eng kattasiga nisbati, foizda (mini ustun kengligi). */
export const shareOfMax = (value: number, max: number): number => (max > 0 ? (value / max) * 100 : 0);

/** Hal qilinmagan qo'ng'irog'i bor operatorlar, eng ko'pidan boshlab. */
export const operatorsWithMissedCalls = (operators: readonly Operator[]): Operator[] =>
  operators
    .filter((operator) => operator.missedUnhandled > 0)
    .sort((a, b) => b.missedUnhandled - a.missedUnhandled);

/** Lid statusi turi → ustun rangi: jarayondagilar ketma-ket ko'k, natija — holat rangida. */
const LEAD_KIND_BAR: Record<string, string> = {
  initial: SEQ_BG[2],
  intermediate: SEQ_BG[3],
  success: "bg-order-delivered",
  fail: "bg-order-cancelled",
};

export const leadKindBarClass = (kind: string): string => LEAD_KIND_BAR[kind] ?? "bg-ink-3";

export const isHighConversion = (conversionPct: number): boolean => conversionPct >= HIGH_CONVERSION_PCT;

const RATING_STARS = [5, 4, 3, 2, 1] as const;
const LOW_RATING_MAX_STARS = 2;

/** Baholar taqsimoti 5 dan 1 gacha; javobda yo'q yulduz — 0. */
export const ratingDistribution = (
  distribution: Readonly<Record<string, number>>,
): { stars: number; count: number; isLow: boolean }[] =>
  RATING_STARS.map((stars) => ({
    stars,
    count: distribution[String(stars)] ?? 0,
    isLow: stars <= LOW_RATING_MAX_STARS,
  }));

/** Qo'ng'iroq seriyalari har doim bir xil rangda: javob berilgan — asosiy, o'tkazib yuborilgan — atkaz rangi. */
export const CALL_SERIES_COLOR = { answered: seriesColor(0), missed: STATUS_COLORS.cancelled } as const;
export type CallSeriesKey = keyof typeof CALL_SERIES_COLOR;

export const isCallSeries = (key: string): key is CallSeriesKey => key in CALL_SERIES_COLOR;

const seriesTotal = (calls: Pick<SalesCalls, "series">, key: CallSeriesKey): number =>
  (calls.series.find((series) => series.key === key)?.values ?? []).reduce((sum, value) => sum + value, 0);

/** Davr bo'yicha jami qo'ng'iroqlar va javob berilganlar ulushi (vaqt qatoridan). */
export const callTotals = (
  calls: Pick<SalesCalls, "series">,
): { answered: number; missed: number; answerRate: number } => {
  const answered = seriesTotal(calls, "answered");
  const missed = seriesTotal(calls, "missed");
  const total = answered + missed;
  return { answered, missed, answerRate: total > 0 ? (answered / total) * 100 : 0 };
};

/** Soniyalar → daqiqa va soniya (`142` → 2 daqiqa 22 soniya). */
export const splitSeconds = (totalSeconds: number): { minutes: number; seconds: number } => {
  const whole = Math.max(0, Math.round(totalSeconds));
  return { minutes: Math.floor(whole / 60), seconds: whole % 60 };
};

/* ---------- filiallar (operator jamoalari) ---------- */

/** Filial jamoasida shu sondan boshlab hal qilinmagan qo'ng'iroqlar "jiddiy" (signal qoidasining sukut chegarasi). */
export const FILIAL_MISSED_CALLS_SERIOUS = 10;
/** Filial jamoasida shu sondan boshlab muddati o'tgan delalar ogohlantirish oladi (signal qoidasining sukut chegarasi). */
export const FILIAL_OVERDUE_ACTIVITIES_WARN = 20;
/** Bir operatorga sotuvi kompaniya o'rtachasidan shuncha foiz past filial "ortda" deb belgilanadi. */
export const FILIAL_LAGGING_PCT = 15;

/** Filiallar reytingi — operatorlar sotuvi bo'yicha, kattadan kichikka. */
export const rankFilials = (filials: readonly SalesFilial[]): SalesFilial[] =>
  [...filials].sort((a, b) => metricAmount(b.salesAmount) - metricAmount(a.salesAmount));

/** Kompaniya bo'yicha bir operatorga o'rtacha sotuv (barcha filiallar sotuvi ÷ barcha operatorlar). */
export const companySalesPerOperator = (filials: readonly SalesFilial[]): number => {
  const operators = filials.reduce((sum, filial) => sum + filial.operatorsTotal, 0);
  const sales = filials.reduce((sum, filial) => sum + metricAmount(filial.salesAmount), 0);
  return operators > 0 ? sales / operators : 0;
};

/** Filialning bir operatorga sotuvi kompaniya o'rtachasidan necha foiz farq qiladi (manfiy — ortda). */
export const perOperatorGapPct = (salesPerOperator: number, companyAverage: number): number =>
  companyAverage > 0 ? Math.round((salesPerOperator / companyAverage - 1) * 1000) / 10 : 0;

export const isLaggingFilial = (gapPct: number): boolean => gapPct <= -FILIAL_LAGGING_PCT;

/** Yarim foizdan kichik farq — "o'rtacha darajada" (butun foizgacha yaxlitlanganda 0 chiqadi). */
const LEVEL_GAP_PCT = 0.5;

export type GapDirection = "above" | "below" | "level";

export const gapDirection = (gapPct: number): GapDirection => {
  if (Math.abs(gapPct) < LEVEL_GAP_PCT) return "level";
  return gapPct > 0 ? "above" : "below";
};

/** Filial rangi tartibga emas, filialning o'ziga biriktiriladi (`id` bo'yicha) — reyting o'zgarsa rang o'zgarmaydi. */
export const filialColorIndex = (filials: readonly Pick<SalesFilial, "id">[], id: number): number => {
  const index = [...filials].sort((a, b) => a.id - b.id).findIndex((filial) => filial.id === id);
  return Math.max(0, index);
};
