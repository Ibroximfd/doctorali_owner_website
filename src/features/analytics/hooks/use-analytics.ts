"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsInteger, useQueryState } from "nuqs";

import { sourceParam, useOrderSource } from "@/shared/hooks/use-order-source";
import { useScopeQuery } from "@/shared/hooks/use-scope";

import { loadAnalytics } from "../api/analytics.api";

export const analyticsKeys = {
  all: ["analytics"] as const,
  summary: (source: string, scope: readonly string[]) =>
    [...analyticsKeys.all, "summary", source, ...scope] as const,
};

export const useAnalyticsQuery = () => {
  const { params, key, options } = useScopeQuery();
  const [source] = useOrderSource();
  return useQuery({
    queryKey: analyticsKeys.summary(source, key),
    queryFn: () => loadAnalytics({ ...params, source: sourceParam(source) }),
    ...options,
  });
};

/** Operatorlar jadvalida qaysi filial ochiq — URL da (`?team=2`), havola ulashiladi. */
export const useOperatorsFilial = () => useQueryState("team", parseAsInteger);
