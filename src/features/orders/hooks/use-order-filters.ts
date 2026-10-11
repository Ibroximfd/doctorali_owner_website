"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";

import { ORDER_STATUSES, type OrderStatus } from "@/shared/config/order-status";

const parsers = {
  // Noma'lum `?status=` e'tiborga olinmaydi (URL qo'lda buzilgan bo'lishi mumkin).
  status: parseAsStringLiteral(ORDER_STATUSES),
  q: parseAsString.withDefault(""),
};

const SEARCH_DEBOUNCE_MS = 300;

/** Qiymat `delayMs` davomida o'zgarmay tursa, shundan keyin qaytadi. */
const useDebouncedValue = <Value>(value: Value, delayMs: number): Value => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};

/**
 * "So'nggi buyurtmalar" filtri URL da (`?status=`, `?q=`): havola ulashiladi,
 * tezkor qidiruv (⌘K) ham shu parametr bilan ochadi. Maydon darhol yangilanadi,
 * so'rov esa yozish to'xtagach yuboriladi (`search`).
 */
export const useOrderFilters = () => {
  const [{ status, q }, setFilters] = useQueryStates(parsers, { history: "replace" });
  const search = useDebouncedValue(q.trim(), SEARCH_DEBOUNCE_MS);

  return {
    status,
    query: q,
    search,
    hasFilters: status !== null || search !== "",
    setStatus: (next: OrderStatus | null) => void setFilters({ status: next }),
    setQuery: (next: string) => void setFilters({ q: next }),
    clear: () => void setFilters({ status: null, q: "" }),
  };
};
