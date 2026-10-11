"use client";

import { useQuery } from "@tanstack/react-query";

import { useScopeQuery } from "@/shared/hooks/use-scope";

import { loadFeed, loadOverview, loadRevenueTrend } from "../api/overview.api";

export const overviewKeys = {
  all: ["overview"] as const,
  summary: (scope: readonly string[]) => [...overviewKeys.all, "summary", ...scope] as const,
  trend: (scope: readonly string[]) => [...overviewKeys.all, "trend", ...scope] as const,
  feed: () => [...overviewKeys.all, "feed"] as const,
};

export const useOverviewQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: overviewKeys.summary(key), queryFn: () => loadOverview(params), ...options });
};

export const useRevenueTrendQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: overviewKeys.trend(key), queryFn: () => loadRevenueTrend(params), ...options });
};

const FEED_LIMIT = 6;
const FEED_REFRESH_MS = 15_000;

/** Jonli lenta: 15 soniyada yangilanadi; tab yashirin bo'lsa to'xtaydi. */
export const useFeedQuery = () =>
  useQuery({
    queryKey: overviewKeys.feed(),
    queryFn: () => loadFeed(FEED_LIMIT),
    staleTime: FEED_REFRESH_MS,
    refetchInterval: FEED_REFRESH_MS,
  });
