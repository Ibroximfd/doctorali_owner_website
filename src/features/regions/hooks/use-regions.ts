"use client";

import { skipToken, useQuery } from "@tanstack/react-query";

import { useScopeQuery } from "@/shared/hooks/use-scope";

import { loadRegionLive, loadRegions } from "../api/regions.api";

/** Viloyat ichidagi jonli holat — kuryerlar harakatlanadi, 15 soniyada yangilanadi. */
const LIVE_MS = 15_000;

export const regionsKeys = {
  all: ["regions"] as const,
  list: (scope: readonly string[]) => [...regionsKeys.all, "list", ...scope] as const,
  live: (code: string | null, filial: string) => [...regionsKeys.all, "live", code, filial] as const,
};

export const useRegionsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: regionsKeys.list(key), queryFn: () => loadRegions(params), ...options });
};

export const useRegionLiveQuery = (code: string | null) => {
  const { params } = useScopeQuery();
  return useQuery({
    queryKey: regionsKeys.live(code, String(params.filial ?? "")),
    queryFn: code === null ? skipToken : () => loadRegionLive(code, params),
    refetchInterval: code === null ? false : LIVE_MS,
  });
};
