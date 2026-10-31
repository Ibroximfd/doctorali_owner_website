"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

/**
 * Zakaz manbasi filtri (Moliya, Analitika): hammasi · ilovadan · operatordan (call-center).
 * URL da (`?source=app`) — havola ulashiladi; sahifadagi hamma raqam, grafik va xarita shunga bo'ysunadi.
 */
export const ORDER_SOURCE_FILTERS = ["all", "app", "operator"] as const;
export type OrderSourceFilter = (typeof ORDER_SOURCE_FILTERS)[number];

export const useOrderSource = () =>
  useQueryState("source", parseAsStringLiteral(ORDER_SOURCE_FILTERS).withDefault("all"));

/** API parametri: «hammasi» yuborilmaydi. */
export const sourceParam = (source: OrderSourceFilter): string | undefined =>
  source === "all" ? undefined : source;
