import { parseJson } from "@/shared/lib/envelope";
import { apiGet, apiSend, skladGet } from "@/shared/lib/http";

import {
  documentSchema,
  grantsResultSchema,
  grantsSchema,
  itemsSchema,
  ledgerSchema,
  ledgerSummarySchema,
  overviewSchema,
  skladsSchema,
  actorKindParam,
  stockSchema,
  type FilialGrants,
  type Ledger,
  type SkladDocument,
} from "../model/warehouse.schema";

/** Sklad API — logist saytidagi bilan bir xil (`/api/sklad/*`, v2 §2.10); Owner faqat o'qiydi. */

export const loadSklads = async () => parseJson(skladsSchema, await skladGet("sklads/"));
export const loadItems = async () => parseJson(itemsSchema, await skladGet("items/", { pagination: false }));
/** Qoldiq to'liq kerak (xarita, yig'indi): `pagination=false` butun ro'yxatni massiv qaytaradi (B-23). */
export const loadStock = async () => parseJson(stockSchema, await skladGet("stock/", { pagination: false }));
export const loadOverview = async () => parseJson(overviewSchema, await skladGet("overview/"));

export type Range = { dateFrom: string; dateTo: string };

export const loadLedgerSummary = async (range: Range) =>
  parseJson(
    ledgerSummarySchema,
    await skladGet("ledger/summary/", { date_from: range.dateFrom, date_to: range.dateTo }),
  );

export type LedgerFilters = {
  from: string | null;
  to: string | null;
  region: string | null;
  /** Sklad (B-8b `?sklad=`) — uning viloyatlaridagi harakatlar. */
  sklad: number | null;
  item: number | null;
  /** Kim (B-23 `?actor_kind=`): `logist | courier | system`, vergul bilan bir nechtasi. */
  actor: string | null;
  type: string | null;
  page: number;
};

export const LEDGER_PAGE_SIZE = 20;

export const loadLedger = async (filters: LedgerFilters): Promise<Ledger> =>
  parseJson(
    ledgerSchema,
    await skladGet("ledger/", {
      date_from: filters.from ?? undefined,
      date_to: filters.to ?? undefined,
      region: filters.region ?? undefined,
      sklad: filters.sklad ?? undefined,
      item: filters.item ?? undefined,
      actor_kind: actorKindParam(filters.actor) ?? undefined,
      movement_type: filters.type ?? undefined,
      page: filters.page,
      page_size: LEDGER_PAGE_SIZE,
    }),
  );

export const loadDocument = async (id: number): Promise<SkladDocument> =>
  parseJson(documentSchema, await skladGet(`documents/${id}/`));

/* ---------- mahsulot dopuski (owner, v2 §2.9) ---------- */

export const loadFilialGrants = async (filialId: number): Promise<FilialGrants> =>
  parseJson(grantsSchema, await apiGet(`structure/sklad-grants/${filialId}/`));

/** Filialning dopusk to'plamini almashtiradi (idempotent). */
export const putFilialGrants = async ({ filialId, itemIds }: { filialId: number; itemIds: number[] }) =>
  parseJson(
    grantsResultSchema,
    await apiSend("put", `structure/sklad-grants/${filialId}/`, { item_ids: itemIds }),
  );
