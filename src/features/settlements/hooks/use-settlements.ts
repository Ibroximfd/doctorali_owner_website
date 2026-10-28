"use client";

import { useQuery } from "@tanstack/react-query";

import { useScopeQuery } from "@/shared/hooks/use-scope";

import { loadAging, loadB2b, loadRegionSettlements, loadSettlementsSummary } from "../api/settlements.api";

export const settlementsKeys = {
  all: ["settlements"] as const,
  summary: (scope: readonly string[]) => [...settlementsKeys.all, "summary", ...scope] as const,
  regions: (scope: readonly string[]) => [...settlementsKeys.all, "regions", ...scope] as const,
  aging: (scope: readonly string[]) => [...settlementsKeys.all, "aging", ...scope] as const,
  b2b: (scope: readonly string[]) => [...settlementsKeys.all, "b2b", ...scope] as const,
};

export const useSettlementsSummaryQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: settlementsKeys.summary(key),
    queryFn: () => loadSettlementsSummary(params),
    ...options,
  });
};

export const useRegionSettlementsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: settlementsKeys.regions(key),
    queryFn: () => loadRegionSettlements(params),
    ...options,
  });
};

export const useAgingQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: settlementsKeys.aging(key), queryFn: () => loadAging(params), ...options });
};

export const useB2bQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: settlementsKeys.b2b(key), queryFn: () => loadB2b(params), ...options });
};
