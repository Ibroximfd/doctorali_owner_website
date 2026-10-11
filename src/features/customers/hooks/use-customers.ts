"use client";

import { useQuery } from "@tanstack/react-query";

import { useScopeQuery } from "@/shared/hooks/use-scope";
import { useMetaQuery } from "@/shared/meta/use-meta-query";

import {
  loadCohorts,
  loadCustomerRegions,
  loadCustomersMix,
  loadCustomersSummary,
  loadTopCustomers,
} from "../api/customers.api";

export const customerKeys = {
  all: ["customers"] as const,
  summary: (scope: readonly string[]) => [...customerKeys.all, "summary", ...scope] as const,
  cohorts: (scope: readonly string[]) => [...customerKeys.all, "cohorts", ...scope] as const,
  mix: (scope: readonly string[]) => [...customerKeys.all, "mix", ...scope] as const,
  top: (scope: readonly string[]) => [...customerKeys.all, "top", ...scope] as const,
  regions: (scope: readonly string[]) => [...customerKeys.all, "regions", ...scope] as const,
};

export const useCustomersSummaryQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: customerKeys.summary(key),
    queryFn: () => loadCustomersSummary(params),
    ...options,
  });
};

export const useCohortsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: customerKeys.cohorts(key), queryFn: () => loadCohorts(params), ...options });
};

export const useCustomersMixQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: customerKeys.mix(key), queryFn: () => loadCustomersMix(params), ...options });
};

export const useTopCustomersQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: customerKeys.top(key), queryFn: () => loadTopCustomers(params), ...options });
};

export const useCustomerRegionsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: customerKeys.regions(key),
    queryFn: () => loadCustomerRegions(params),
    ...options,
  });
};

/** Hudud kodi → nomi (`meta/` lug'atidan). Lug'at kelmagan yoki kod noma'lum bo'lsa — kodning o'zi. */
export const useRegionName = (): ((code: string) => string) => {
  const regions = useMetaQuery().data?.regions;
  return (code) => regions?.find((region) => region.code === code)?.name ?? code;
};
