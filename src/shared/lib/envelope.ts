import { z } from "zod";

import { camelize, type Camelized } from "./camelize";

/**
 * `/api/owner/*` javoblarining umumiy shakli (`02_BACKEND_TZ` §2.2–2.3).
 * Har javob chegarada shu yerda tekshiriladi; ichkarida tiplarga ishoniladi.
 */

/** Hamma joyda bir xil metrika: qiymat + oldingi davr + o'zgarish foizi. */
export const metricSchema = z.object({
  /** Davrda ma'lumot bo'lmasa `null` (masalan bugun hali yakunlangan buyurtma yo'q) — nol emas, «—». */
  value: z.number().nullable(),
  previous: z.number().nullable(),
  delta_pct: z.number().nullable(),
  /** `uzs · count · pct · min · minutes · hours · days` — ochiq ro'yxat: yangi birlik blokni yiqitmasin. */
  unit: z.string().optional(),
});
export type Metric = Camelized<z.infer<typeof metricSchema>>;

/**
 * Ma'lumot bo'lmasa `null` keladigan ko'rsatkich (`API_QOLLANMA` §8): butun blok `null`
 * yoki `value: null` — ikkalasi ham «yo'q» deb o'qiladi (nol emas).
 */
export const nullableMetricSchema = z.preprocess(
  (raw) =>
    typeof raw === "object" && raw !== null && "value" in raw && (raw as { value: unknown }).value === null
      ? null
      : raw,
  metricSchema.nullable(),
);

/**
 * Foiz ko'rsatkichining o'zgarishi foiz punktlarda: 10% → 12% = +2 f.p.
 * `delta_pct` nisbiy (+20%) — ulush ko'rsatkichlari uchun u chalg'itadi.
 */
export const pointChange = (metric: Pick<Metric, "value" | "previous">): number | null =>
  metric.value === null || metric.previous === null
    ? null
    : Math.round((metric.value - metric.previous) * 10) / 10;

/** Yig'ish va saralash uchun: ma'lumot yo'q (`null`) — 0 sifatida (ekranda baribir «—»). */
export const metricAmount = (metric: Pick<Metric, "value"> | null | undefined): number => metric?.value ?? 0;

export const granularitySchema = z.enum(["hour", "day", "week", "month"]);

/** Vaqt qatori: bitta `labels` o'qi, bir nechta seriya (bitta o'lchov birligi). */
export const timeseriesSchema = z.object({
  labels: z.array(z.string()),
  series: z.array(z.object({ key: z.string(), values: z.array(z.number()) })),
  compare: z.array(z.number()).nullable().optional(),
});
export type Timeseries = Camelized<z.infer<typeof timeseriesSchema>>;

/**
 * Davr (B-24): backend `{from, to, date_from, date_to}` beradi — ikkala juft ham qabul qilinadi;
 * `from/to` bo'lmasa `date_from/date_to` dan olinadi.
 */
const periodSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
    const period = raw as Record<string, unknown>;
    return { ...period, from: period.from ?? period.date_from, to: period.to ?? period.date_to };
  },
  z.object({
    from: z.string(),
    to: z.string(),
    granularity: granularitySchema,
    label: z.string(),
  }),
);

export const envelopeSchema = <Data extends z.ZodTypeAny>(data: Data) =>
  z.object({
    period: periodSchema,
    compare: z.object({ from: z.string(), to: z.string() }).nullable(),
    filials: z.array(z.number()),
    generated_at: z.string(),
    freshness: z.record(z.string()).default({}),
    data,
  });

export type Envelope<Data> = {
  period: { from: string; to: string; granularity: z.infer<typeof granularitySchema>; label: string };
  compare: { from: string; to: string } | null;
  filials: number[];
  generatedAt: string;
  freshness: Record<string, string>;
  data: Data;
};

/**
 * Javobni tekshiradi va kalitlarni `camelCase` ga o'tkazadi. Shartnoma buzilsa
 * zod aniq yo'l bilan xato beradi (`data.kpis.orders.value: Required`).
 */
export const parseEnvelope = <Data extends z.ZodTypeAny>(
  schema: Data,
  json: unknown,
): Envelope<Camelized<z.infer<Data>>> => {
  const parsed = envelopeSchema(schema).parse(json);
  return {
    period: parsed.period,
    compare: parsed.compare,
    filials: parsed.filials,
    generatedAt: parsed.generated_at,
    freshness: parsed.freshness,
    data: camelize(parsed.data as z.infer<Data>),
  };
};

/** Konvertsiz javoblar (ro'yxat, sozlama) uchun: tekshiruv + camelCase. */
export const parseJson = <Shape extends z.ZodTypeAny>(
  schema: Shape,
  json: unknown,
): Camelized<z.infer<Shape>> => camelize(schema.parse(json) as z.infer<Shape>);
