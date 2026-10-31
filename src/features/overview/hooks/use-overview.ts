"use client";

import { useQuery } from "@tanstack/react-query";

import { useScopeQuery } from "@/shared/hooks/use-scope";

import { loadOverview } from "../api/overview.api";

export const overviewKeys = {
  all: ["overview"] as const,
  summary: (scope: readonly string[]) => [...overviewKeys.all, "summary", ...scope] as const,
};

export const useOverviewQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: overviewKeys.summary(key), queryFn: () => loadOverview(params), ...options });
};
