import { TIME_ZONE } from "./format";

/**
 * Global filtr ("scope"): davr · filial · taqqoslash. URL da yashaydi va har
 * so'rov kalitiga kiradi — hamma blok bitta tilim bilan ishlaydi.
 */

export const PERIOD_KEYS = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "90d",
  "month",
  "prev_month",
  "year",
  "custom",
] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];

export const COMPARE_MODES = ["previous", "yoy", "none"] as const;
export type CompareMode = (typeof COMPARE_MODES)[number];

export type Scope = {
  period: PeriodKey;
  /** Faqat `period === "custom"` da ishlatiladi (`YYYY-MM-DD`). */
  from: string | null;
  to: string | null;
  /** Bo'sh — barcha filiallar. */
  filials: number[];
  compare: CompareMode;
};

export const DEFAULT_SCOPE: Scope = { period: "30d", from: null, to: null, filials: [], compare: "previous" };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Berilgan lahzaning Toshkentdagi kalendar sanasi (`YYYY-MM-DD`). */
export const tashkentDate = (date: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

/** `YYYY-MM-DD` ga kun qo'shadi (manfiy ham bo'ladi). Kalendar arifmetikasi UTC da — DST yo'q. */
export const addDays = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const hasValidRange = (scope: Scope): scope is Scope & { from: string; to: string } =>
  scope.from !== null &&
  scope.to !== null &&
  ISO_DATE.test(scope.from) &&
  ISO_DATE.test(scope.to) &&
  scope.from <= scope.to;

/**
 * UI scope → API query parametrlari (`02_BACKEND_TZ` §2.1).
 * API da `90d` preset yo'q — u `custom` oraliq sifatida yuboriladi.
 * Yaroqsiz `custom` oraliq jimgina 30 kunga tushadi (URL qo'lda buzilgan bo'lishi mumkin).
 */
export const scopeToParams = (scope: Scope, today: string): Record<string, string> => {
  const params: Record<string, string> = { compare: scope.compare };
  if (scope.filials.length > 0) params.filial = [...scope.filials].sort((a, b) => a - b).join(",");

  if (scope.period === "90d") {
    return { ...params, period: "custom", date_from: addDays(today, -89), date_to: today };
  }
  if (scope.period === "custom") {
    if (!hasValidRange(scope)) return { ...params, period: "30d" };
    return { ...params, period: "custom", date_from: scope.from, date_to: scope.to };
  }
  return { ...params, period: scope.period };
};

/** Parametrlardan so'rov kaliti bo'lagi: tartib barqaror, shuning uchun bir xil filtr — bir xil kalit. */
export const paramsKey = (params: Readonly<Record<string, string>>): readonly string[] =>
  Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`);

/** So'rov kaliti uchun barqaror ko'rinish (parametrlar tartibi o'zgarmaydi). */
export const scopeKey = (scope: Scope, today: string): readonly string[] =>
  paramsKey(scopeToParams(scope, today));

/**
 * Filial filtrisiz parametrlar — filiallarni o'zaro taqqoslaydigan bloklar uchun:
 * ro'yxat har doim to'liq qaytadi, tanlangan filial unda faqat belgilanadi.
 */
export const withoutFilial = (params: Readonly<Record<string, string>>): Record<string, string> => {
  const { filial: _filial, ...rest } = params;
  return rest;
};

/**
 * Filialga "kirish": bosilgan filial allaqachon yagona tanlangan bo'lsa filtr
 * tozalanadi, aks holda faqat shu filial qoladi.
 */
export const toggleFilialFocus = (selected: readonly number[], id: number): number[] =>
  selected.length === 1 && selected[0] === id ? [] : [id];

/** Davr bugunni qamraydimi — "jonli" ma'lumot tezroq eskiradi. */
export const includesToday = (scope: Scope, today: string): boolean => {
  if (scope.period === "yesterday" || scope.period === "prev_month") return false;
  if (scope.period === "custom") return hasValidRange(scope) ? scope.to >= today : true;
  return true;
};

export const isPeriodKey = (value: string): value is PeriodKey =>
  (PERIOD_KEYS as readonly string[]).includes(value);

const monthStart = (isoDate: string, offsetMonths = 0): string => {
  const date = new Date(`${isoDate.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offsetMonths);
  return date.toISOString().slice(0, 10);
};

/**
 * Davr → aniq sana oralig'i (`date_from`, `date_to`) — preset bilmaydigan API lar uchun
 * (sklad API: `?date_from=&date_to=`, TZ 18 §2).
 */
export const scopeRange = (scope: Scope, today: string): { dateFrom: string; dateTo: string } => {
  switch (scope.period) {
    case "today":
      return { dateFrom: today, dateTo: today };
    case "yesterday":
      return { dateFrom: addDays(today, -1), dateTo: addDays(today, -1) };
    case "7d":
      return { dateFrom: addDays(today, -6), dateTo: today };
    case "90d":
      return { dateFrom: addDays(today, -89), dateTo: today };
    case "month":
      return { dateFrom: monthStart(today), dateTo: today };
    case "prev_month":
      return { dateFrom: monthStart(today, -1), dateTo: addDays(monthStart(today), -1) };
    case "year":
      return { dateFrom: monthStart(today, -11), dateTo: today };
    case "custom":
      return hasValidRange(scope)
        ? { dateFrom: scope.from, dateTo: scope.to }
        : { dateFrom: addDays(today, -29), dateTo: today };
    default:
      return { dateFrom: addDays(today, -29), dateTo: today };
  }
};
