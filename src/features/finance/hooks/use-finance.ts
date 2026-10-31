"use client";

import { useQuery } from "@tanstack/react-query";

import { sourceParam, useOrderSource } from "@/shared/hooks/use-order-source";
import { useScopeQuery } from "@/shared/hooks/use-scope";

import { loadFinance } from "../api/finance.api";

export const financeKeys = {
  all: ["finance"] as const,
  summary: (source: string, scope: readonly string[]) =>
    [...financeKeys.all, "summary", source, ...scope] as const,
};

/** Bitta so'rov butun sahifani to'ldiradi — bloklar bir xil raqamlarni ko'rsatadi. */
export const useFinanceQuery = () => {
  const { params, key, options } = useScopeQuery();
  const [source] = useOrderSource();
  return useQuery({
    queryKey: financeKeys.summary(source, key),
    queryFn: () => loadFinance({ ...params, source: sourceParam(source) }),
    ...options,
  });
};
