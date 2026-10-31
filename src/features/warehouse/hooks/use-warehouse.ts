"use client";

import {
  keepPreviousData,
  skipToken,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { parseAsInteger, parseAsString, useQueryState, useQueryStates } from "nuqs";

import { useScope } from "@/shared/hooks/use-scope";
import { scopeRange, tashkentDate } from "@/shared/lib/scope";
import { useMetaQuery } from "@/shared/meta/use-meta-query";

import {
  loadDocument,
  loadFilialGrants,
  loadItems,
  loadLedger,
  loadLedgerSummary,
  loadOverview,
  loadSklads,
  loadStock,
  putFilialGrants,
  type LedgerFilters,
} from "../api/warehouse.api";

export const warehouseKeys = {
  all: ["warehouse"] as const,
  sklads: () => [...warehouseKeys.all, "sklads"] as const,
  items: () => [...warehouseKeys.all, "items"] as const,
  stock: () => [...warehouseKeys.all, "stock"] as const,
  overview: () => [...warehouseKeys.all, "overview"] as const,
  summary: (from: string, to: string) => [...warehouseKeys.all, "summary", from, to] as const,
  ledger: (filters: LedgerFilters) => [...warehouseKeys.all, "ledger", filters] as const,
  document: (id: number | null) => [...warehouseKeys.all, "document", id] as const,
  grants: (filialId: number) => [...warehouseKeys.all, "grants", filialId] as const,
};

/** Qoldiq — hozirgi holat, daqiqada bir yangilanadi (sklad doskasi keshi 30 s — TZ 18 §6.1). Owner faqat o'qiydi. */
const LIVE_MS = 60_000;
const DICTIONARY_MS = 10 * 60_000;

export const useSkladsQuery = () => useQuery({ queryKey: warehouseKeys.sklads(), queryFn: loadSklads });
export const useItemsQuery = () =>
  useQuery({ queryKey: warehouseKeys.items(), queryFn: loadItems, staleTime: DICTIONARY_MS });
/** Mahsulot rasmlari `items/` dan (id → rasm) — qoldiq, tarix va dopusk qatorlari uchun. */
export const useItemImages = (): ((id: number) => string | null) => {
  const items = useItemsQuery().data;
  return (id) => items?.find((item) => item.id === id)?.image ?? null;
};

export const useStockQuery = () =>
  useQuery({
    queryKey: warehouseKeys.stock(),
    queryFn: loadStock,
    staleTime: LIVE_MS,
    refetchInterval: LIVE_MS,
  });
export const useOverviewQuery = () =>
  useQuery({
    queryKey: warehouseKeys.overview(),
    queryFn: loadOverview,
    staleTime: LIVE_MS,
    refetchInterval: LIVE_MS,
  });

/** Davr bo'yicha harakat yig'indisi — global davr aniq sanalarga aylanadi (sklad API preset bilmaydi). */
export const useLedgerSummaryQuery = () => {
  const { scope } = useScope();
  const range = scopeRange(scope, tashkentDate(new Date()));
  return useQuery({
    queryKey: warehouseKeys.summary(range.dateFrom, range.dateTo),
    queryFn: () => loadLedgerSummary(range),
    placeholderData: keepPreviousData,
  });
};

/** Tanlangan sklad URL da (`?sklad=3`); bo'sh — hammasi. */
export const useSelectedSklad = () => useQueryState("sklad", parseAsInteger);

/* ---------- mahsulot dopuski ---------- */

/** Har filial dopuski alohida so'raladi (`sklad-grants/{filial}`) — filiallar `meta/` dan. */
export const useGrantsQueries = () => {
  const filials = useMetaQuery().data?.filials ?? [];
  return useQueries({
    queries: filials.map((filial) => ({
      queryKey: warehouseKeys.grants(filial.id),
      queryFn: () => loadFilialGrants(filial.id),
    })),
  });
};

export type GrantMove = { productId: number; from: number | null; to: number | null };

/**
 * Mahsulotni bir filialdan boshqasiga o'tkazish (bitta mahsulot — bitta filial, backend o'zi
 * tortmaydi): har ikkala filialning to'plami YANGIDAN o'qiladi (eskirgan kesh bilan boshqa
 * mahsulotni o'chirib yubormaslik uchun), avval eskisidan olinadi, keyin yangisiga beriladi.
 * Ikkinchi qadam yiqilsa — mahsulot eski filialga qaytariladi (o'rtada «egasiz» qolmasin).
 */
export const useMoveGrant = () => {
  const queryClient = useQueryClient();
  const fresh = (filialId: number) =>
    queryClient.fetchQuery({
      queryKey: warehouseKeys.grants(filialId),
      queryFn: () => loadFilialGrants(filialId),
      staleTime: 0,
    });
  const idsOf = async (filialId: number) => (await fresh(filialId)).items.map((item) => item.productId);

  return useMutation({
    mutationFn: async ({ productId, from, to }: GrantMove) => {
      if (from !== null)
        await putFilialGrants({
          filialId: from,
          itemIds: (await idsOf(from)).filter((id) => id !== productId),
        });
      if (to === null) return;
      try {
        await putFilialGrants({ filialId: to, itemIds: [...new Set([...(await idsOf(to)), productId])] });
      } catch (error) {
        if (from !== null)
          await putFilialGrants({
            filialId: from,
            itemIds: [...new Set([...(await idsOf(from)), productId])],
          })
            .then(() => undefined)
            .catch(() => undefined);
        throw error;
      }
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: [...warehouseKeys.all, "grants"] }),
  });
};

/* ---------- tarix ---------- */

/** Tarix filtrlari URL da (`h*` — sahifadagi boshqa tanlovlar bilan to'qnashmasin). */
export const useLedgerFilters = () => {
  const [state, setState] = useQueryStates({
    hFrom: parseAsString,
    hTo: parseAsString,
    hRegion: parseAsString,
    hSklad: parseAsInteger,
    hItem: parseAsInteger,
    hActor: parseAsString,
    hType: parseAsString,
    hPage: parseAsInteger.withDefault(1),
  });
  const filters: LedgerFilters = {
    from: state.hFrom,
    to: state.hTo,
    region: state.hRegion,
    sklad: state.hSklad,
    item: state.hItem,
    actor: state.hActor,
    type: state.hType,
    page: state.hPage,
  };
  const isFiltered = [
    filters.from,
    filters.to,
    filters.region,
    filters.sklad,
    filters.item,
    filters.actor,
    filters.type,
  ].some((value) => value !== null);
  return {
    filters,
    isFiltered,
    /** Filtr o'zgarsa — birinchi sahifaga. */
    setFilter: (patch: Partial<Omit<typeof state, "hPage">>) => void setState({ ...patch, hPage: null }),
    setPage: (page: number) => void setState({ hPage: page === 1 ? null : page }),
    clear: () =>
      void setState({
        hFrom: null,
        hTo: null,
        hRegion: null,
        hSklad: null,
        hItem: null,
        hActor: null,
        hType: null,
        hPage: null,
      }),
  };
};

export const useLedgerQuery = () => {
  const { filters } = useLedgerFilters();
  return useQuery({
    queryKey: warehouseKeys.ledger(filters),
    queryFn: () => loadLedger(filters),
    placeholderData: keepPreviousData,
  });
};

export const useDocumentQuery = (id: number | null) =>
  useQuery({
    queryKey: warehouseKeys.document(id),
    queryFn: id === null ? skipToken : () => loadDocument(id),
  });

/** Ochiq tarix qatori URL da: `?entry=<daftar qatori>`. */
export const useWarehouseDialogs = () => {
  const [entry, setEntry] = useQueryState("entry", parseAsInteger);
  return {
    entryId: entry,
    openEntry: (id: number) => void setEntry(id),
    closeEntry: () => void setEntry(null),
  };
};
