"use client";

import { useQuery } from "@tanstack/react-query";

import { useAllFilialsQuery, useScopeQuery } from "@/shared/hooks/use-scope";

import {
  loadLeadSources,
  loadLeadsFunnel,
  loadOperator,
  loadOperators,
  loadSalesCalls,
  loadSalesFilials,
  loadSalesFilialsTrend,
  loadSalesRatings,
  loadSalesSummary,
} from "../api/sales.api";

export const salesKeys = {
  all: ["sales"] as const,
  summary: (scope: readonly string[]) => [...salesKeys.all, "summary", ...scope] as const,
  operators: (scope: readonly string[]) => [...salesKeys.all, "operators", ...scope] as const,
  operator: (id: number, scope: readonly string[]) => [...salesKeys.all, "operator", id, ...scope] as const,
  leadsFunnel: (scope: readonly string[]) => [...salesKeys.all, "leads-funnel", ...scope] as const,
  leadSources: (scope: readonly string[]) => [...salesKeys.all, "lead-sources", ...scope] as const,
  calls: (scope: readonly string[]) => [...salesKeys.all, "calls", ...scope] as const,
  ratings: (scope: readonly string[]) => [...salesKeys.all, "ratings", ...scope] as const,
  filials: (scope: readonly string[]) => [...salesKeys.all, "filials", ...scope] as const,
  filialsTrend: (scope: readonly string[]) => [...salesKeys.all, "filials-trend", ...scope] as const,
};

export const useSalesSummaryQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: salesKeys.summary(key), queryFn: () => loadSalesSummary(params), ...options });
};

export const useOperatorsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: salesKeys.operators(key), queryFn: () => loadOperators(params), ...options });
};

/** Bitta operator (drawer). Davr o'zgarsa shu operatorning oldingi natijasi xiralashib turadi. */
export const useOperatorQuery = (id: number) => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: salesKeys.operator(id, key),
    queryFn: () => loadOperator(id, params),
    ...options,
  });
};

export const useLeadsFunnelQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: salesKeys.leadsFunnel(key),
    queryFn: () => loadLeadsFunnel(params),
    ...options,
  });
};

export const useLeadSourcesQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: salesKeys.leadSources(key),
    queryFn: () => loadLeadSources(params),
    ...options,
  });
};

export const useSalesCallsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: salesKeys.calls(key), queryFn: () => loadSalesCalls(params), ...options });
};

export const useSalesRatingsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: salesKeys.ratings(key), queryFn: () => loadSalesRatings(params), ...options });
};

/**
 * Operator jamoalari filial kesimida. Filial filtri bu so'rovga kirmaydi:
 * filial tanlanganda ham ro'yxat to'liq qoladi (tanlangani belgilanadi) va
 * boshqa filialga bir bosishda o'tish mumkin.
 */
export const useSalesFilialsQuery = () => {
  const { params, key, options } = useAllFilialsQuery();
  return useQuery({ queryKey: salesKeys.filials(key), queryFn: () => loadSalesFilials(params), ...options });
};

export const useSalesFilialsTrendQuery = () => {
  const { params, key, options } = useAllFilialsQuery();
  return useQuery({
    queryKey: salesKeys.filialsTrend(key),
    queryFn: () => loadSalesFilialsTrend(params),
    ...options,
  });
};
