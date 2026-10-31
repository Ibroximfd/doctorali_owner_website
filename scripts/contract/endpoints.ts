/**
 * Frontend backenddan chaqiradigan BARCHA `GET /api/owner/*` endpointlar — yagona
 * ro'yxat. Shartnoma tekshirgichi (`npm run contract:check`) va hujjat shundan
 * foydalanadi; test har namuna endpoint shu yerda borligini kafolatlaydi.
 *
 * Sxemalar — ilovadagining o'zi: backend javobi shu yerda o'tsa, ekranda ham o'tadi.
 * Backend v2 (2026-10-31) jonli javoblari bilan solishtirilgan: `live.test.ts`.
 */
import type { z } from "zod";

import { aiStatusSchema, analysisSchema } from "@/features/ai/model/ai.schema";
import { analyticsSchema } from "@/features/analytics/model/analytics.schema";
import { userSchema } from "@/features/auth/model/auth.schema";
import {
  auditSchema,
  catalogSchema,
  performanceSchema,
  seatsSchema,
  structureSchema,
} from "@/features/filials/model/filials.schema";
import { financeSchema } from "@/features/finance/model/finance.schema";
import { appV2Schema } from "@/features/mobile-app/model/mobile-app.schema";
import { overviewSchema } from "@/features/overview/model/overview.schema";
import { sessionsResponseSchema } from "@/features/settings/model/settings.schema";
import { salesOperatorsSchema } from "@/features/staff/model/sales-operators";
import {
  documentSchema,
  grantsSchema,
  itemsSchema,
  ledgerSchema,
  ledgerSummarySchema,
  overviewSchema as skladOverviewSchema,
  skladsSchema,
  stockSchema,
} from "@/features/warehouse/model/warehouse.schema";
import { metaSchema } from "@/shared/meta/meta.schema";

export type Query = Record<string, string>;

/** Yo'ldagi `:id` qayerdan olinadi: boshqa endpoint javobidan birinchi yozuv. */
type IdSource = { path: string; query: Query; pick: (json: unknown) => string[] };

export type ContractEndpoint = {
  section: string;
  /** `/api/owner/` ga nisbatan, `/` bilan tugaydi. */
  path: string;
  /** `envelope` — `{period, compare, filials, generated_at, freshness, data}`; `plain` — konvertsiz. */
  shape: "envelope" | "plain";
  schema: z.ZodTypeAny;
  /** Global filtr (`period`, `date_from`, `date_to`, `compare`, `filial`) qabul qiladimi. */
  scoped: boolean;
  /** Filtrdan tashqari doimiy parametrlar (frontend aynan shularni yuboradi). */
  query?: Query;
  /** Bir nechta qiymat bilan chaqiriladigan parametr (har biri alohida tekshiriladi). */
  variants?: Query[];
  idSource?: IdSource;
  note?: string;
};

const SCOPED = { shape: "envelope", scoped: true } as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Kartalar bitta yozuvda emas, bir nechtasida tekshiriladi — bo'sh maydonlar har yozuvda boshqacha. */
export const DETAIL_SAMPLE_SIZE = 25;

/** Konvert ichidagi ro'yxat yoki `{results}` dagi yozuvlarning `id` lari (ko'pi bilan `DETAIL_SAMPLE_SIZE`). */
const firstId =
  (field = "id") =>
  (json: unknown): string[] => {
    const holder = isRecord(json) && "data" in json ? json.data : json;
    const list: unknown = Array.isArray(holder) ? holder : isRecord(holder) ? holder.results : undefined;
    if (!Array.isArray(list)) return [];
    return list.slice(0, DETAIL_SAMPLE_SIZE).flatMap((item: unknown) => {
      const id = isRecord(item) ? item[field] : undefined;
      return typeof id === "string" || typeof id === "number" ? [String(id)] : [];
    });
  };

/** Sklad API yo'llari ro'yxatda `sklad-api/` bilan (namuna bazadagi nom) — haqiqiy URL `/api/sklad/…`. */
export const SKLAD_PREFIX = "sklad-api/";

/** Ro'yxatdagi yo'l → backend URL yo'li. */
export const apiUrlOf = (path: string): string =>
  path.startsWith(SKLAD_PREFIX) ? `/api/sklad/${path.slice(SKLAD_PREFIX.length)}` : `/api/owner/${path}`;

const SOURCE_VARIANTS: Query[] = [{}, { source: "app" }, { source: "operator" }];

export const CONTRACT_ENDPOINTS: readonly ContractEndpoint[] = [
  /* ---------- umumiy ---------- */
  { section: "Umumiy", path: "meta/", shape: "plain", schema: metaSchema, scoped: false },
  { section: "Umumiy", path: "me/", shape: "plain", schema: userSchema, scoped: false },
  { section: "Umumiy", path: "overview/v2/", ...SCOPED, schema: overviewSchema, note: "B-11" },

  /* ---------- tuzilma (v2 §2) ---------- */
  {
    section: "Filiallar",
    path: "structure/",
    shape: "plain",
    scoped: false,
    schema: structureSchema,
    note: "v2 §2.1",
  },
  {
    section: "Filiallar",
    path: "structure/audit/",
    shape: "plain",
    scoped: false,
    schema: auditSchema,
    query: { limit: "50" },
    note: "v2 §2.8",
  },
  {
    section: "Filiallar",
    path: "structure/sklad-grants/:id/",
    shape: "plain",
    scoped: false,
    schema: grantsSchema,
    note: "v2 §2.9",
    idSource: { path: "structure/", query: {}, pick: firstId() },
  },
  {
    section: "Filiallar",
    path: "structure/permissions/",
    shape: "plain",
    scoped: false,
    schema: catalogSchema,
    note: "B-4",
  },
  {
    section: "Filiallar",
    path: "structure/filials/:id/seats/",
    shape: "plain",
    scoped: false,
    schema: seatsSchema,
    note: "B-5; `q` — qidiruv",
    idSource: { path: "structure/", query: {}, pick: firstId() },
  },
  { section: "Filiallar", path: "filials/performance/", ...SCOPED, schema: performanceSchema, note: "B-6" },

  /* ---------- moliya, analitika, ilova (v2) ---------- */
  {
    section: "Moliya",
    path: "finance/v2/",
    ...SCOPED,
    schema: financeSchema,
    note: "B-12; `source` pul zanjiriga qo'llanmaydi",
    variants: SOURCE_VARIANTS,
  },
  {
    section: "Analitika",
    path: "analytics/v2/",
    ...SCOPED,
    schema: analyticsSchema,
    note: "B-13; `source=app|operator`",
    variants: SOURCE_VARIANTS,
  },
  { section: "Ilova", path: "app/v2/", ...SCOPED, schema: appV2Schema, note: "B-14" },

  /* ---------- xodimlar (B-15: `staff/*` backendda yo'q) ---------- */
  {
    section: "Xodimlar",
    path: "sales/operators/",
    ...SCOPED,
    schema: salesOperatorsSchema,
    note: "B-15 — logistlar uchun manba yo'q",
  },

  /* ---------- sklad (`/api/sklad/*`, v2 §2.10) ---------- */
  { section: "Sklad", path: `${SKLAD_PREFIX}sklads/`, shape: "plain", scoped: false, schema: skladsSchema },
  {
    section: "Sklad",
    path: `${SKLAD_PREFIX}items/`,
    shape: "plain",
    scoped: false,
    schema: itemsSchema,
    query: { pagination: "false" },
  },
  {
    section: "Sklad",
    path: `${SKLAD_PREFIX}stock/`,
    shape: "plain",
    scoped: false,
    schema: stockSchema,
    query: { pagination: "false" },
  },
  {
    section: "Sklad",
    path: `${SKLAD_PREFIX}overview/`,
    shape: "plain",
    scoped: false,
    schema: skladOverviewSchema,
  },
  {
    section: "Sklad",
    path: `${SKLAD_PREFIX}ledger/`,
    shape: "plain",
    scoped: false,
    schema: ledgerSchema,
    variants: [{}, { movement_type: "receipt" }, { page: "2", page_size: "20" }],
  },
  {
    section: "Sklad",
    path: `${SKLAD_PREFIX}ledger/summary/`,
    shape: "plain",
    scoped: false,
    schema: ledgerSummarySchema,
  },
  {
    section: "Sklad",
    path: `${SKLAD_PREFIX}documents/:id/`,
    shape: "plain",
    scoped: false,
    schema: documentSchema,
    idSource: {
      path: `${SKLAD_PREFIX}ledger/`,
      query: { movement_type: "receipt" },
      pick: (json) => {
        const results = isRecord(json) && Array.isArray(json.results) ? json.results : [];
        return results
          .flatMap((row: unknown) => {
            const source = isRecord(row) ? row.source : undefined;
            const id = isRecord(source) ? source.id : undefined;
            return typeof id === "number" ? [String(id)] : [];
          })
          .slice(0, DETAIL_SAMPLE_SIZE);
      },
    },
  },

  /* ---------- AI (v2 §8) ---------- */
  {
    section: "AI",
    path: "ai/status/",
    shape: "plain",
    scoped: false,
    schema: aiStatusSchema,
    note: "B-10",
  },
  { section: "AI", path: "ai/analysis/", shape: "plain", scoped: false, schema: analysisSchema },

  /* ---------- sozlamalar ---------- */
  { section: "Sozlamalar", path: "sessions/", shape: "plain", scoped: false, schema: sessionsResponseSchema },
];

/** Global filtrning frontend yuboradigan tipik holatlari (`npm run contract:check -- --full`). */
export const SCOPE_MATRIX: readonly Query[] = [
  { period: "today", compare: "previous" },
  { period: "yesterday", compare: "previous" },
  { period: "7d", compare: "previous" },
  { period: "30d", compare: "previous" },
  { period: "month", compare: "previous" },
  { period: "prev_month", compare: "yoy" },
  { period: "year", compare: "none" },
  { period: "custom", date_from: "2026-07-01", date_to: "2026-09-28", compare: "previous" },
  { period: "30d", compare: "previous", filial: "1" },
  { period: "30d", compare: "previous", filial: "1,2" },
];

export const DEFAULT_SCOPE: Query = { period: "30d", compare: "previous" };
