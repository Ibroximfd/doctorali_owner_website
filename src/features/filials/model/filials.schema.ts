import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { aliases, list, num, numbers, optNum, str } from "@/shared/lib/lenient";

/**
 * Owner tuzilma boshqaruvi — backend v2 §2 (`/api/owner/structure/*`) va javoblar B-1…B-6a
 * (2026-10-31): filial belgisi `code`, rahbar tahriri, parol tiklash, atomar almashtirish,
 * dopusk katalogi, filialdagi o'rinlar.
 */

export const LEADER_ROLES = ["chief_logist", "chief_operator"] as const;
export type LeaderRole = (typeof LEADER_ROLES)[number];

const headSchema = z.object({
  seat_id: z.number(),
  full_name: z.string(),
  username: z.string(),
  role_id: z.number(),
  /** Qo'shimcha dopusklar — `PATCH roles/{id}` shuni to'liq almashtiradi. */
  permissions: z.array(z.string()).default([]),
  /**
   * Rol sukutlari ∪ qo'shimchalar (B-26) — dopusk oynasidagi «Rol bilan keladi» bo'limi shundan
   * (o'chirib bo'lmaydi). Kelmasa `null`: sukut huquqlar alohida ko'rsatilmaydi.
   */
  effective_permissions: z.array(z.string()).nullable().default(null),
});

const filialSchema = z.object({
  id: z.number(),
  name: z.string(),
  /** Hudud KODI (B-16: `toshkent_shahar`); nomi — `region_name`. Eski javobda nom bo'lishi mumkin. */
  region: z.string().nullable().default(null),
  region_name: z.string().nullable().default(null),
  is_main: z.boolean(),
  is_active: z.boolean().default(true),
  zone_id: z.number().nullable().default(null),
  code: z.string().nullable().default(null),
  chief_operator: headSchema.nullable().default(null),
  chief_logist: headSchema.nullable().default(null),
  departments_count: z.number().default(0),
  operators_count: z.number().default(0),
  logists_count: z.number().default(0),
});

/** `GET /structure/`. */
export const structureSchema = z.object({ count: z.number(), results: z.array(filialSchema) });
export type Structure = Camelized<z.infer<typeof structureSchema>>;
export type FilialItem = Structure["results"][number];
export type Head = NonNullable<FilialItem["chiefLogist"]>;

/** `POST /structure/filials/`, `PATCH …/{id}/`, `POST …/set-main/` javobi. */
export const filialObjectSchema = z.object({
  id: z.number(),
  code: z.string().nullable().default(null),
  name: z.string(),
  region: z.string().nullable().default(null),
  is_main: z.boolean(),
  is_active: z.boolean().default(true),
  zone_id: z.number().nullable().default(null),
});

const roleSchema = z.object({
  id: z.number(),
  role: z.string(),
  scope_kind: z.string(),
  scope_id: z.string().nullable(),
  permissions: z.array(z.string()),
  effective_permissions: z.array(z.string()).default([]),
  since: z.string().nullable(),
  until: z.string().nullable(),
});

/** `POST /structure/filials/{id}/heads/` — yangi akkauntda `password` BIR MARTA keladi. */
export const appointResultSchema = z.object({
  filial_id: z.number(),
  kind: z.string(),
  head: headSchema,
  role: roleSchema,
  password: z.string().optional(),
});
export type AppointResult = Camelized<z.infer<typeof appointResultSchema>>;

/** `PATCH /structure/roles/{id}/`. */
export const roleResultSchema = roleSchema;

/** `PATCH …/heads/{kind}/` (B-1) — javob shakli tasdiqlanmagan: faqat muvaffaqiyat o'qiladi. */
export const headUpdateResultSchema = z.unknown();

/** `POST …/heads/{kind}/reset-password/` (B-2) — yangi parol BIR MARTA. */
export const resetPasswordResultSchema = z.object({
  password: z.string(),
  username: z.string().optional(),
});

/** `POST …/heads/{kind}/replace/` (B-2) — atomar; yangi akkauntda parol bir marta keladi. */
export const replaceResultSchema = z.object({
  head: headSchema.optional(),
  password: z.string().optional(),
});
export type ReplaceResult = Camelized<z.infer<typeof replaceResultSchema>>;

/** `DELETE /structure/filials/{id}/heads/{kind}/`. */
export const revokeResultSchema = z.object({ revoked: z.number(), seat_id: z.number().nullable() });

/** `GET /structure/audit/?limit=` — parol auditga tushmaydi. */
export const auditSchema = z.object({
  count: z.number(),
  results: z.array(
    z.object({
      at: z.string(),
      action: z.string(),
      endpoint: z.string().default(""),
      method: z.string().default(""),
      status: z.number().nullable().default(null),
      params: z.record(z.unknown()).default({}),
      user_id: z.number().nullable().default(null),
      ip: z.string().nullable().default(null),
    }),
  ),
});
export type AuditEntry = Camelized<z.infer<typeof auditSchema>>["results"][number];

/** Ro'yxat: yalang' massiv yoki `{count, results}` — ikkalasi ham. */
const rows = <Item extends z.ZodTypeAny>(item: Item) =>
  z.preprocess(
    (raw) =>
      Array.isArray(raw)
        ? raw
        : typeof raw === "object" && raw !== null && "results" in raw
          ? (raw as { results: unknown }).results
          : raw,
    z.array(item),
  );

/** `GET /structure/permissions/` (B-4): `role` — qaysi rahbarga (`both` — ikkalasiga), `group` — guruh. */
export const catalogSchema = rows(
  z.preprocess(
    (raw) => {
      if (typeof raw !== "object" || raw === null) return raw;
      const item = raw as Record<string, unknown>;
      const label = typeof item.label === "string" && item.label !== "" ? item.label : item.key;
      return {
        ...item,
        label,
        label_ru: typeof item.label_ru === "string" && item.label_ru !== "" ? item.label_ru : label,
      };
    },
    z.object({
      key: z.string(),
      label: z.string(),
      label_ru: z.string(),
      role: z.string(),
      group: z.string().nullable().default(null),
      main_only: z.boolean().default(false),
    }),
  ),
);
export type Permission = Camelized<z.infer<typeof catalogSchema>>[number];

/** `GET /structure/filials/{id}/seats/?q=` (B-5). `department` — nom yoki `{name}`. */
export const seatsSchema = rows(
  z.object({
    seat_id: z.number(),
    full_name: z.string(),
    username: z.string().default(""),
    department: z.preprocess(
      (raw) =>
        typeof raw === "object" && raw !== null && "name" in raw
          ? String((raw as { name: unknown }).name)
          : typeof raw === "string" || typeof raw === "number"
            ? String(raw)
            : null,
      z.string().nullable(),
    ),
    is_admin: z.boolean().default(false),
    is_logist: z.boolean().default(false),
  }),
);
export type SeatOption = Camelized<z.infer<typeof seatsSchema>>[number];

/**
 * `GET /api/owner/filials/performance/` (B-6). Jonli javob (2026-10-31): konvert, `data.filials[]`
 * — `{id, name, is_main, leads, sold, in_transit, delivered, otkaz, revenue, conversion_pct,
 * otkaz_pct, trend:{labels, sold, delivered}}`. Umumiy `labels` yo'q — birinchi filial trendidan.
 */
const trendOf = (raw: unknown): unknown =>
  typeof raw === "object" && raw !== null && !Array.isArray(raw) && "sold" in raw
    ? (raw as { sold: unknown }).sold
    : raw;

const performanceRowSchema = aliases(
  {
    filial_id: ["id"],
    cancelled: ["otkaz", "canceled"],
    cancel_rate_pct: ["otkaz_pct", "cancel_rate"],
    conversion_pct: ["conversion"],
  },
  z.object({
    filial_id: num,
    leads: num,
    sold: num,
    in_transit: num,
    delivered: num,
    cancelled: num,
    revenue: num,
    conversion_pct: optNum,
    cancel_rate_pct: optNum,
    trend: z.preprocess(trendOf, numbers("sold")),
  }),
);

const firstTrendLabels = (filials: unknown): unknown => {
  const first: unknown = Array.isArray(filials) ? filials[0] : undefined;
  if (typeof first !== "object" || first === null || !("trend" in first)) return undefined;
  const trend = (first as { trend: unknown }).trend;
  return typeof trend === "object" && trend !== null && "labels" in trend
    ? (trend as { labels: unknown }).labels
    : undefined;
};

export const performanceSchema = z.preprocess(
  (raw) => {
    const body = Array.isArray(raw) ? { filials: raw } : raw;
    if (typeof body !== "object" || body === null) return body;
    const record = body as Record<string, unknown>;
    return record.labels === undefined ? { ...record, labels: firstTrendLabels(record.filials) } : record;
  },
  z.object({ labels: list(str), filials: list(performanceRowSchema) }),
);
export type Performance = Camelized<z.infer<typeof performanceSchema>>;
export type FilialPerformance = Performance["filials"][number];

/* ---------- formalar (xato matnlari — `filials.*.errors.*` kalitlari) ---------- */

/** Filial belgisi (B-3): 8 belgigacha, faollar orasida noyob (`409 code_taken`). Bo'sh — belgisiz. */
const codeField = z
  .string()
  .trim()
  .max(8, "codeLong")
  .transform((value) => value.toUpperCase());

export const filialCreateSchema = z.object({
  name: z.string().trim().min(2, "nameShort"),
  code: codeField,
  region: z.string(),
});
export type FilialCreateValues = z.infer<typeof filialCreateSchema>;

export const filialEditSchema = z.object({
  name: z.string().trim().min(2, "nameShort"),
  code: codeField,
  isActive: z.boolean(),
});
export type FilialEditValues = z.infer<typeof filialEditSchema>;

const fullNameField = z.string().trim().min(3, "nameShort");
const usernameField = z
  .string()
  .trim()
  .regex(/^[\w.@+-]{3,150}$/, "usernameInvalid");
const isStrong = (value: string) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

/** Yangi akkaunt: F.I.Sh., login, parol (parol javobda bir marta qaytadi). */
export const accountFormSchema = z.object({
  fullName: fullNameField,
  username: usernameField,
  password: z.string().refine(isStrong, "passwordWeak"),
});
export type AccountFormValues = z.infer<typeof accountFormSchema>;

/** Almashtirishda parol ixtiyoriy — bo'sh qolsa backend o'zi yaratadi va bir marta qaytaradi (B-2). */
export const replaceAccountSchema = accountFormSchema.extend({
  password: z.string().refine((value) => value === "" || isStrong(value), "passwordWeak"),
});

/** Rahbar ismi va logini (B-1). Telefon tahrirlanmaydi. */
export const headEditSchema = z.object({ fullName: fullNameField, username: usernameField });
export type HeadEditValues = z.infer<typeof headEditSchema>;

/** Tahrirlash formasi akkaunt maydonlarini qayta ishlatadi — parol maydoni chizilmaydi va tekshirilmaydi. */
export const headEditFormSchema = headEditSchema.extend({ password: z.string() });
