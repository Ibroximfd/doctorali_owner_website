import { TIME_ZONE, type Granularity } from "@/shared/lib/format";
import { addDays, tashkentDate } from "@/shared/lib/scope";

/**
 * Namuna (mock) ma'lumot dvigateli: so'rov parametrlaridan davr va filialni
 * chiqaradi, asosiy (30 kunlik) raqamlarni shunga masshtablaydi. Natija
 * deterministik — bir xil so'rov bir xil javob beradi (testlar shunga tayanadi).
 * Javob shakllari `docs/02_BACKEND_TZ.md` dagi shartnomaga aynan mos.
 */

export const MOCK_FILIALS = [
  {
    id: 1,
    name: "Toshkent",
    region: "toshkent_shahar",
    is_main: true,
    has_clinic: true,
    has_sales: true,
    share: 0.56,
  },
  {
    id: 2,
    name: "Qo'qon",
    region: "fargona",
    is_main: false,
    has_clinic: true,
    has_sales: true,
    share: 0.26,
  },
  {
    id: 3,
    name: "Samarqand",
    region: "samarqand",
    is_main: false,
    has_clinic: false,
    has_sales: true,
    share: 0.18,
  },
] as const;

export type MockFilial = (typeof MOCK_FILIALS)[number];
export type CompareMode = "previous" | "yoy" | "none";
export type MetricUnit = "uzs" | "count" | "pct" | "min";
export type MetricDto = {
  value: number;
  previous: number | null;
  delta_pct: number | null;
  unit?: MetricUnit;
};

export type MockPeriod = {
  key: string;
  from: string;
  to: string;
  days: number;
  granularity: Granularity;
  /** Vaqt qatori o'qi: ISO sana yoki (soat uchun) ISO sana-vaqt. */
  labels: string[];
  /** 30 kunlik asosga nisbatan hajm. */
  scale: number;
  /** O'zgarish foizlarini davrga qarab "jonlantirish" koeffitsienti. */
  deltaFactor: number;
};

export type MockContext = {
  now: Date;
  today: string;
  period: MockPeriod;
  /** Tanlangan filiallar (hech biri tanlanmagan bo'lsa — hammasi). */
  filials: readonly MockFilial[];
  filialShare: number;
  isAllFilials: boolean;
  compare: CompareMode;
  searchParams: URLSearchParams;
  /** Yo'ldagi `:param` qiymatlari. */
  params: Record<string, string>;
  body: unknown;
  /** Davr ichidagi oqim (soni/summa): davr × filial bo'yicha masshtablanadi. */
  flow: (base30d: number) => number;
  /** Hozirgi holat (qoldiq, navbat): faqat filial bo'yicha masshtablanadi. */
  stock: (base: number) => number;
  metric: (value: number, deltaPct: number, unit?: MetricUnit) => MetricDto;
  /** `total` ni davr nuqtalariga taqsimlaydi (hafta kuni/soat shakli + shovqin + o'sish). */
  series: (total: number, seed: number, growth?: number) => number[];
};

/* ---------- deterministik tasodif ---------- */

export const rng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

/** Kun davomidagi faollik shakli: ikki cho'qqi (11:00 va 17:00). */
export const hourShape = (hour: number): number =>
  0.08 + Math.exp(-((hour - 11) ** 2) / 9) + 0.85 * Math.exp(-((hour - 17) ** 2) / 7);

const DAY_SHAPE_TOTAL = Array.from({ length: 24 }, (_, hour) => hourShape(hour)).reduce(
  (sum, value) => sum + value,
  0,
);

const pad = (value: number): string => String(value).padStart(2, "0");

const tashkentHour = (date: Date): number =>
  Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hour12: false }).format(date),
  ) % 24;

const hourLabels = (date: string, count: number): string[] =>
  Array.from({ length: count }, (_, hour) => `${date}T${pad(hour)}:00:00+05:00`);

const dayLabels = (from: string, days: number): string[] =>
  Array.from({ length: days }, (_, index) => addDays(from, index));

const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

const monthStart = (isoDate: string, offsetMonths = 0): string => {
  const date = new Date(`${isoDate.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offsetMonths);
  return date.toISOString().slice(0, 10);
};

const DELTA_FACTOR: Record<string, number> = {
  today: 1.7,
  yesterday: -0.6,
  "7d": 0.8,
  "30d": 1,
  month: 1.1,
  prev_month: 0.9,
  year: 2.2,
  custom: 1.2,
};

const rangePeriod = (key: string, from: string, to: string, today: string, now: Date): MockPeriod => {
  const days = Math.max(1, daysBetween(from, to));
  const base = { key, from, to, days, deltaFactor: DELTA_FACTOR[key] ?? 1 };

  if (days === 1) {
    const isToday = from === today;
    const hours = isToday ? tashkentHour(now) + 1 : 24;
    const share =
      hourLabels(from, hours).reduce((sum, _, hour) => sum + hourShape(hour), 0) / DAY_SHAPE_TOTAL;
    return { ...base, granularity: "hour", labels: hourLabels(from, hours), scale: share / 30 };
  }
  if (days <= 62) return { ...base, granularity: "day", labels: dayLabels(from, days), scale: days / 30 };
  if (days <= 200) {
    const weeks = Math.ceil(days / 7);
    return {
      ...base,
      granularity: "week",
      labels: Array.from({ length: weeks }, (_, index) => addDays(from, index * 7)),
      scale: days / 30,
    };
  }
  const months: string[] = [];
  for (let cursor = monthStart(from); cursor <= to; cursor = monthStart(cursor, 1)) months.push(cursor);
  // Uzoq davrda biznes o'sgan — o'tmish oylar hozirgidan kichikroq.
  return { ...base, granularity: "month", labels: months, scale: (days / 30) * 0.9 };
};

export const resolvePeriod = (searchParams: URLSearchParams, now: Date): MockPeriod => {
  const today = tashkentDate(now);
  const key = searchParams.get("period") ?? "today";

  switch (key) {
    case "today":
      return rangePeriod(key, today, today, today, now);
    case "yesterday":
      return rangePeriod(key, addDays(today, -1), addDays(today, -1), today, now);
    case "7d":
      return rangePeriod(key, addDays(today, -6), today, today, now);
    case "month":
      return rangePeriod(key, monthStart(today), today, today, now);
    case "prev_month":
      return rangePeriod(key, monthStart(today, -1), addDays(monthStart(today), -1), today, now);
    case "year":
      return rangePeriod(key, monthStart(today, -11), today, today, now);
    case "custom": {
      const from = searchParams.get("date_from");
      const to = searchParams.get("date_to");
      if (from && to && from <= to) return rangePeriod(key, from, to, today, now);
      return rangePeriod("30d", addDays(today, -29), today, today, now);
    }
    default:
      return rangePeriod("30d", addDays(today, -29), today, today, now);
  }
};

const resolveFilials = (searchParams: URLSearchParams): readonly MockFilial[] => {
  const ids = (searchParams.get("filial") ?? "")
    .split(",")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  const selected = MOCK_FILIALS.filter((filial) => ids.includes(filial.id));
  return selected.length > 0 ? selected : MOCK_FILIALS;
};

const resolveCompare = (searchParams: URLSearchParams): CompareMode => {
  const value = searchParams.get("compare");
  return value === "yoy" || value === "none" ? value : "previous";
};

const round1 = (value: number): number => Math.round(value * 10) / 10;

const weekdayFactor = (isoDate: string): number => {
  const weekday = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  if (weekday === 0) return 0.7;
  return weekday === 6 ? 0.88 : 1;
};

export const buildContext = (input: {
  searchParams: URLSearchParams;
  params?: Record<string, string>;
  body?: unknown;
  now?: Date;
}): MockContext => {
  const now = input.now ?? new Date();
  const period = resolvePeriod(input.searchParams, now);
  const filials = resolveFilials(input.searchParams);
  const compare = resolveCompare(input.searchParams);
  const filialShare = filials.reduce((sum, filial) => sum + filial.share, 0);
  const compareFactor = compare === "yoy" ? 2.4 : 1;

  const series = (total: number, seed: number, growth = 0.18): number[] => {
    const random = rng(seed);
    const count = period.labels.length;
    const weights = period.labels.map((label, index) => {
      const shape =
        period.granularity === "hour"
          ? hourShape(index)
          : period.granularity === "day"
            ? weekdayFactor(label)
            : 1;
      const ramp = 1 - growth / 2 + (growth * index) / Math.max(1, count - 1);
      return shape * ramp * (0.88 + random() * 0.24);
    });
    const sum = weights.reduce((acc, weight) => acc + weight, 0) || 1;
    return weights.map((weight) => Math.round((total * weight) / sum));
  };

  return {
    now,
    today: tashkentDate(now),
    period,
    filials,
    filialShare,
    isAllFilials: filials.length === MOCK_FILIALS.length,
    compare,
    searchParams: input.searchParams,
    params: input.params ?? {},
    body: input.body,
    flow: (base30d) => Math.max(0, Math.round(base30d * period.scale * filialShare)),
    stock: (base) => Math.round(base * filialShare),
    metric: (value, deltaPct, unit) => {
      if (compare === "none") return { value, previous: null, delta_pct: null, unit };
      const delta = round1(deltaPct * period.deltaFactor * compareFactor);
      return { value, previous: Math.round((value / (1 + delta / 100)) * 100) / 100, delta_pct: delta, unit };
    },
    series,
  };
};

/** `02_BACKEND_TZ` §2.2 javob konverti. */
export const envelope = (ctx: MockContext, data: unknown) => {
  const { period, compare } = ctx;
  const shift = compare === "yoy" ? 365 : period.days;
  return {
    period: { from: period.from, to: period.to, granularity: period.granularity, label: period.key },
    compare:
      compare === "none" ? null : { from: addDays(period.from, -shift), to: addDays(period.to, -shift) },
    filials: ctx.filials.map((filial) => filial.id),
    generated_at: ctx.now.toISOString(),
    freshness: {
      orders: ctx.now.toISOString(),
      clinic: new Date(ctx.now.getTime() - 90_000).toISOString(),
      app: `${ctx.today}T03:00:00+05:00`,
    },
    data,
  };
};

/**
 * Butun `total` ni vaznlarga mutanosib bo'ladi (eng katta qoldiq usuli) —
 * bo'laklar yig'indisi aynan `total`. Shunda KPI va uning grafigi/jadvali
 * yaxlitlash tufayli bir-biridan farq qilmaydi.
 */
export const apportion = (total: number, weights: readonly number[]): number[] => {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0 || weightSum <= 0) return weights.map(() => 0);

  const exact = weights.map((weight) => (total * weight) / weightSum);
  const parts = exact.map((value) => Math.floor(value));
  const leftover = total - parts.reduce((sum, part) => sum + part, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((x, y) => y.remainder - x.remainder);
  for (const { index } of byRemainder.slice(0, leftover)) parts[index] = (parts[index] ?? 0) + 1;
  return parts;
};

/** Sparkline uchun 12 nuqtali tasodifiy yurish (`up` — umumiy yo'nalish). */
export const sparkline = (seed: number, up = 0.25): number[] => {
  const random = rng(seed);
  let value = 50;
  return Array.from({ length: 12 }, () => {
    value += (random() - 0.5 + up * 0.5) * 12;
    return Math.round(value * 10) / 10;
  });
};
