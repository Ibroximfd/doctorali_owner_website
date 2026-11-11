import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { list, num, optNum, optStr, str, toNumber } from "@/shared/lib/lenient";

/**
 * Tumanlar tarixi — `GET /api/owner/logistics/district-changes/` (bo'lim `logistics`, prodda
 * 2026-11-11 dan). Konvertsiz, eng yangisi birinchi: `{count, page, page_size, results}`.
 * O'qish chidamli: notanish `action`/`source`/`field` yiqitmaydi (UI qiymatning o'zini ko'rsatadi),
 * yetishmagan maydon — bo'sh yoki `null`.
 */

export const DISTRICT_ACTIONS = ["created", "renamed", "hidden", "restored", "edited"] as const;
export type DistrictAction = (typeof DISTRICT_ACTIONS)[number];

export const CHANGE_SOURCES = ["chief", "admin"] as const;

export const CHANGE_FIELDS = ["name_uz", "name_ru", "name_uz_cyrl", "is_active"] as const;

/** Tuman turi: `city` | `district` | `custom` (bosh kuryer qo'lda qo'shgan). */
export const CUSTOM_KIND = "custom";

/** Jurnal shu kundan yuritiladi — undan oldingi o'zgarishlar yozilmagan. */
export const JOURNAL_START = "2026-11-10";

export const DISTRICT_CHANGES_PAGE_SIZE = 50;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Maydon qiymati: nom (satr) yoki `is_active` (mantiqiy); boshqasi satrga, yo'q — `null`. */
const changeValue = z.preprocess(
  (raw) => (raw === null || raw === undefined ? null : typeof raw === "boolean" ? raw : String(raw)),
  z.union([z.string(), z.boolean()]).nullable(),
);

/** `is_active` kelmasa — faol deb olinadi (yashirin belgisi faqat aniq `false` da). */
const isActive = z.preprocess((raw) => raw !== false, z.boolean());

const districtSchema = z.preprocess(
  (raw) => (isRecord(raw) ? raw : {}),
  z.object({
    code: str,
    name_uz: str,
    kind: str,
    is_active: isActive,
  }),
);

const actorSchema = z.preprocess(
  (raw) => (isRecord(raw) ? raw : null),
  z.object({ id: optNum, name: str }).nullable(),
);

export const districtChangeSchema = z.object({
  id: num,
  at: str,
  region: str,
  region_name: optStr,
  district: districtSchema,
  action: str,
  old_name: optStr,
  new_name: optStr,
  changes: list(z.object({ field: str, old: changeValue, new: changeValue })),
  actor: actorSchema,
  source: str,
});

export const districtChangesSchema = z.object({
  count: num,
  page: z.preprocess((raw) => toNumber(raw) ?? 1, z.number()),
  page_size: z.preprocess((raw) => toNumber(raw) ?? DISTRICT_CHANGES_PAGE_SIZE, z.number()),
  // obyekt bo'lmagan qator tashlanadi — bitta buzuq yozuv butun jurnalni yiqitmasin
  results: z.preprocess(
    (raw) => (Array.isArray(raw) ? raw.filter(isRecord) : []),
    z.array(districtChangeSchema),
  ),
});

export type DistrictChanges = Camelized<z.infer<typeof districtChangesSchema>>;
export type DistrictChange = DistrictChanges["results"][number];
export type FieldChange = DistrictChange["changes"][number];
