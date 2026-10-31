import { z } from "zod";

import type { Camelized } from "./camelize";
import { shortFilialCode } from "./filial-code";
import { metricSchema, parseEnvelope, type Envelope } from "./envelope";

/**
 * Shakli hali tasdiqlanmagan v2 javoblari (`overview/v2/`, `finance/v2/`, `analytics/v2/`,
 * `app/v2/`, `filials/performance/`) uchun chidamli o'qish: konvert yoki yalang' `data`,
 * son yoki satr («5.00»), `Metric` obyekti yoki oddiy son, muqobil maydon nomlari.
 * Haqiqiy javob olingach sxemalar qat'iylashtiriladi (`docs/BACKEND_SAVOLLAR_V2_2026-10-31.md`).
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Son: `12`, `"12.50"`, `{value: 12}`. O'qib bo'lmasa — `null`. */
export const toNumber = (raw: unknown): number | null => {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string" && raw.trim() !== "") {
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }
  if (isRecord(raw) && "value" in raw) return toNumber(raw.value);
  return null;
};

/** Majburiy son — yo'q bo'lsa 0 (yig'indilar uchun; foiz va o'rtacha uchun `optNum`). */
export const num = z.preprocess((raw) => toNumber(raw) ?? 0, z.number());

/** Ixtiyoriy son — yo'q bo'lsa `null` (ekranda «—»). */
export const optNum = z.preprocess((raw) => toNumber(raw), z.number().nullable());

export const str = z.preprocess((raw) => (raw === null || raw === undefined ? "" : String(raw)), z.string());

export const optStr = z.preprocess(
  (raw) => (raw === null || raw === undefined || raw === "" ? null : String(raw)),
  z.string().nullable(),
);

/** Massiv — yo'q bo'lsa bo'sh. */
export const list = <Item extends z.ZodTypeAny>(item: Item) =>
  z.preprocess((raw) => (Array.isArray(raw) ? raw : []), z.array(item));

/** Sonlar qatori: `[1,2]` yoki `[{value:1}]` yoki `[{date, sold}]` (berilgan kalit bo'yicha). */
export const numbers = (key?: string) =>
  z.preprocess(
    (raw) =>
      Array.isArray(raw) ? raw.map((item) => toNumber(key && isRecord(item) ? item[key] : item) ?? 0) : [],
    z.array(z.number()),
  );

/** `Metric` yoki oddiy son → `Metric` (oldingi davr yo'q bo'lsa `null`). */
export const metric = z.preprocess((raw) => {
  if (isRecord(raw) && "value" in raw)
    return {
      value: toNumber(raw.value),
      previous: toNumber(raw.previous),
      delta_pct: toNumber(raw.delta_pct),
      unit: typeof raw.unit === "string" ? raw.unit : undefined,
    };
  return { value: toNumber(raw), previous: null, delta_pct: null };
}, metricSchema);

/**
 * Muqobil nomlar: `aliases({conversion_pct: ["conversion", "conv_pct"]}, schema)` — asosiy nom
 * bo'lmasa birinchi topilgan muqobili olinadi. Ichki obyektlar uchun ham ishlaydi.
 */
export const aliases = <Shape extends z.ZodTypeAny>(
  names: Readonly<Record<string, readonly string[]>>,
  schema: Shape,
) =>
  z.preprocess((raw) => {
    if (!isRecord(raw)) return raw;
    const next = { ...raw };
    for (const [main, others] of Object.entries(names)) {
      if (next[main] !== undefined && next[main] !== null) continue;
      const found = others.find((name) => next[name] !== undefined && next[name] !== null);
      if (found !== undefined) next[main] = next[found];
    }
    return next;
  }, schema);

const EMPTY_PERIOD = { from: "", to: "", granularity: "day", label: "" } as const;

/**
 * Konvert (`{period, data, …}`) yoki yalang' `data` — ikkalasi ham bir xil `Envelope` ga keladi.
 * Yalang' javobda davr `period` maydonidan (bo'lsa), aks holda bo'sh.
 */
export const parseFlexible = <Data extends z.ZodTypeAny>(
  schema: Data,
  json: unknown,
): Envelope<Camelized<z.infer<Data>>> => {
  if (isRecord(json) && "data" in json && isRecord(json.period)) return parseEnvelope(schema, json);
  const period = isRecord(json) && isRecord(json.period) ? json.period : {};
  return parseEnvelope(schema, {
    period: {
      from: typeof period.from === "string" ? period.from : EMPTY_PERIOD.from,
      to: typeof period.to === "string" ? period.to : EMPTY_PERIOD.to,
      granularity: ["hour", "day", "week", "month"].includes(String(period.granularity))
        ? period.granularity
        : EMPTY_PERIOD.granularity,
      label: typeof period.label === "string" ? period.label : EMPTY_PERIOD.label,
    },
    compare: null,
    filials: [],
    generated_at:
      isRecord(json) && typeof json.generated_at === "string" ? json.generated_at : new Date().toISOString(),
    freshness: {},
    data: json,
  });
};

/** Filial qisqa belgisi (`code`, B-3) kelmasa — nomidan ikki harf (`filialCode` bilan bir qoida). */
export const withFilialCode = <Shape extends z.ZodTypeAny>(
  schema: Shape,
  codeKey = "code",
  nameKey = "name",
) =>
  z.preprocess((raw) => {
    if (!isRecord(raw)) return raw;
    const code = typeof raw[codeKey] === "string" ? raw[codeKey] : null;
    const name = typeof raw[nameKey] === "string" ? raw[nameKey] : "";
    return { ...raw, [codeKey]: shortFilialCode({ code, name }) };
  }, schema);

/**
 * Ichki havola obyektini yoyadi: `{filial: {id, name}}` → `filial_id`, `filial_name` (jonli
 * javoblar shunday; namuna va UI — tekis maydonlar). Mavjud tekis maydon ustun turadi.
 */
export const flattenRef = <Shape extends z.ZodTypeAny>(key: string, schema: Shape) =>
  z.preprocess((raw) => {
    if (!isRecord(raw) || !isRecord(raw[key])) return raw;
    const ref = raw[key];
    const flat: Record<string, unknown> = {};
    for (const [inner, value] of Object.entries(ref)) flat[`${key}_${inner}`] = value;
    return { ...flat, ...raw, [key]: undefined };
  }, schema);

/** `part ÷ whole × 100`, bir xona aniqlikda; bo'linuvchi yo'q — `null`. */
export const percentOf = (part: unknown, whole: unknown): number | null => {
  const top = toNumber(part);
  const bottom = toNumber(whole);
  if (top === null || bottom === null || bottom === 0) return null;
  return Math.round((top / bottom) * 1000) / 10;
};

/** Ro'yxatdagi maydon yig'indisi (satr sonlar ham). */
export const sumOf = (rows: unknown, key: string): number =>
  Array.isArray(rows)
    ? rows.reduce<number>((sum, row) => sum + (isRecord(row) ? (toNumber(row[key]) ?? 0) : 0), 0)
    : 0;

/** Obyektga yetishmagan maydonlarni qo'shadi (bor bo'lsa tegmaydi). */
export const withDefaults = <Shape extends z.ZodTypeAny>(
  fill: (raw: Record<string, unknown>) => Record<string, unknown>,
  schema: Shape,
) =>
  z.preprocess((raw) => {
    if (!isRecord(raw)) return raw;
    const extra = fill(raw);
    const next = { ...raw };
    for (const [key, value] of Object.entries(extra))
      if (next[key] === undefined || next[key] === null) next[key] = value;
    return next;
  }, schema);

/**
 * Pul qoldig'i — manfiy bo'lmaydi. Backend manfiy bersa (testda `with_chiefs: -44000`, savol
 * B-17) ekranda 0 turadi: «bosh kuryerda −44 000» ma'nosiz.
 */
export const balance = z.preprocess((raw) => Math.max(0, toNumber(raw) ?? 0), z.number());
