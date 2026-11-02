import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { list, num, optNum, optStr, str } from "@/shared/lib/lenient";

/**
 * «Reytinglar» — `GET /api/owner/ratings/{couriers|operators|logists}/` (API_QOLLANMA §5.r,
 * ILOVA_HOLAT_VA_KURYER_REYTINGI §7.2–7.5). Javob konvertda, `data`: `{tab, formula, summary, rows}`.
 * Formulani SERVER tanlaydi va yozadi — panel `name` ni ustun sarlavhasi, `how` ni izoh qiladi.
 * Ma'lumot yo'q ko'rsatkich `null` (0 emas) — hamma son `optNum` bilan o'qiladi.
 */

export const RATING_TABS = ["couriers", "operators", "logists"] as const;
export type RatingTab = (typeof RATING_TABS)[number];

/** `desc` — ko'p yaxshi, `asc` — kam yaxshi (logist tezligi). Notanish qiymat — `desc`. */
const directionSchema = z.preprocess((raw) => (raw === "asc" ? "asc" : "desc"), z.enum(["asc", "desc"]));

const formulaMetricSchema = z.object({
  key: str,
  name: str,
  how: optStr,
  unit: optStr,
  direction: directionSchema,
  null_when: optStr,
  /** Halol izoh: «mijoz operatorga baho bermaydi …» — panel ko'rsatishi shart. */
  note: optStr,
});

const formulaSchema = z.preprocess(
  (raw) => (typeof raw === "object" && raw !== null ? raw : {}),
  z.object({
    score: formulaMetricSchema.nullable().catch(null).default(null),
    metrics: list(formulaMetricSchema.nullable().catch(null)).transform((items) =>
      items.filter((item): item is NonNullable<typeof item> => item !== null),
    ),
  }),
);

/** Baho taqsimoti `{"1".."5": son}` — yetishmagan yulduz 0 (bu sanoq, «ma'lumot yo'q» emas). */
export const STARS = ["5", "4", "3", "2", "1"] as const;
const distributionSchema = z.preprocess((raw) => {
  const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(STARS.map((star) => [star, Number(source[star]) || 0]));
}, z.record(z.number()));

const personSchema = z.object({
  id: num,
  name: str,
  filial_id: optNum,
});

const courierRowSchema = z.object({
  courier: z.object({
    id: num,
    name: str,
    chief_id: optNum,
    region: optStr,
    is_active: z.boolean().catch(true).default(true),
  }),
  score: optNum,
  rating_avg: optNum,
  ratings_count: optNum,
  distribution: distributionSchema,
  delivered_orders: optNum,
  rated_share: optNum,
});

const operatorRowSchema = z.object({
  operator: personSchema,
  score: optNum,
  orders_total: optNum,
  orders_delivered: optNum,
  orders_cancelled: optNum,
  /** Pul satr (`"1500000"`); yetkazilgani bo'lmasa `null`. */
  revenue: optNum,
});

const logistRowSchema = z.object({
  logist: personSchema,
  score: optNum,
  finalized_orders: optNum,
  delivered_orders: optNum,
  cancelled_orders: optNum,
  avg_review_minutes: optNum,
});

const objectOrEmpty = (raw: unknown) => (typeof raw === "object" && raw !== null ? raw : {});

export const couriersDataSchema = z.object({
  formula: formulaSchema,
  summary: z.preprocess(
    objectOrEmpty,
    z.object({
      avg: optNum,
      count: optNum,
      distribution: distributionSchema,
      with_comment: optNum,
      low_count: optNum,
      couriers: optNum,
    }),
  ),
  rows: list(courierRowSchema),
});

export const operatorsDataSchema = z.object({
  formula: formulaSchema,
  summary: z.preprocess(
    objectOrEmpty,
    z.object({ operators: optNum, orders_total: optNum, orders_delivered: optNum, avg_score: optNum }),
  ),
  rows: list(operatorRowSchema),
});

export const logistsDataSchema = z.object({
  formula: formulaSchema,
  summary: z.preprocess(
    objectOrEmpty,
    z.object({ logists: optNum, finalized_orders: optNum, avg_review_minutes: optNum }),
  ),
  rows: list(logistRowSchema),
});

export type Formula = Camelized<z.infer<typeof formulaSchema>>;
export type FormulaMetric = Formula["metrics"][number];
export type CouriersData = Camelized<z.infer<typeof couriersDataSchema>>;
export type OperatorsData = Camelized<z.infer<typeof operatorsDataSchema>>;
export type LogistsData = Camelized<z.infer<typeof logistsDataSchema>>;
export type CourierRow = CouriersData["rows"][number];
export type OperatorRow = OperatorsData["rows"][number];
export type LogistRow = LogistsData["rows"][number];
