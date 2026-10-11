"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useScopeQuery } from "@/shared/hooks/use-scope";

import {
  loadOrder,
  loadOrders,
  loadOrdersBreakdown,
  loadOrdersFunnel,
  loadOrdersHeatmap,
  loadOrdersSummary,
  loadOrdersTrend,
  loadStageDurations,
  loadStuckOrders,
  type OrderListFilters,
} from "../api/orders.api";
import type { BreakdownDimension } from "../model/orders.schema";

type ScopeKey = readonly string[];

export const orderKeys = {
  all: ["orders"] as const,
  summary: (scope: ScopeKey) => [...orderKeys.all, "summary", ...scope] as const,
  funnel: (scope: ScopeKey) => [...orderKeys.all, "funnel", ...scope] as const,
  trend: (scope: ScopeKey) => [...orderKeys.all, "trend", ...scope] as const,
  breakdown: (by: BreakdownDimension, scope: ScopeKey) =>
    [...orderKeys.all, "breakdown", by, ...scope] as const,
  stageDurations: (scope: ScopeKey) => [...orderKeys.all, "stage-durations", ...scope] as const,
  heatmap: (scope: ScopeKey) => [...orderKeys.all, "heatmap", ...scope] as const,
  stuck: (filial: string) => [...orderKeys.all, "stuck", filial] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (scope: ScopeKey, filters: OrderListFilters) =>
    [...orderKeys.lists(), ...scope, filters.status ?? "", filters.search] as const,
  detail: (id: string) => [...orderKeys.all, "detail", id] as const,
};

export const useOrdersSummaryQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: orderKeys.summary(key), queryFn: () => loadOrdersSummary(params), ...options });
};

export const useOrdersFunnelQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: orderKeys.funnel(key), queryFn: () => loadOrdersFunnel(params), ...options });
};

export const useOrdersTrendQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: orderKeys.trend(key), queryFn: () => loadOrdersTrend(params), ...options });
};

export const useOrdersBreakdownQuery = (by: BreakdownDimension) => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: orderKeys.breakdown(by, key),
    queryFn: () => loadOrdersBreakdown(by, params),
    ...options,
  });
};

export const useStageDurationsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: orderKeys.stageDurations(key),
    queryFn: () => loadStageDurations(params),
    ...options,
  });
};

export const useOrdersHeatmapQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: orderKeys.heatmap(key), queryFn: () => loadOrdersHeatmap(params), ...options });
};

const STUCK_REFRESH_MS = 60_000;

/** Qotib qolganlar — hozirgi holat: davr o'zgarsa qayta so'ralmaydi, faqat filial kalitda. */
export const useStuckOrdersQuery = () => {
  const { params } = useScopeQuery();
  const filial = params.filial;

  return useQuery({
    queryKey: orderKeys.stuck(filial ?? "all"),
    queryFn: () => loadStuckOrders(filial),
    staleTime: STUCK_REFRESH_MS,
    refetchInterval: STUCK_REFRESH_MS,
    placeholderData: keepPreviousData,
  });
};

export const useOrdersListQuery = (filters: OrderListFilters) => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: orderKeys.list(key, filters),
    queryFn: () => loadOrders(params, filters),
    ...options,
  });
};

const DETAIL_STALE_MS = 30_000;

/**
 * Bitta buyurtma. `id` yo'q (karta yopiq) bo'lsa so'rov yuborilmaydi. Oldingi
 * natija saqlanmaydi — boshqa buyurtma ochilganda eskisi ko'rinib qolmasligi kerak.
 */
export const useOrderQuery = (id: string | null) =>
  useQuery({
    queryKey: orderKeys.detail(id ?? ""),
    queryFn: () => loadOrder(id ?? ""),
    enabled: id !== null,
    staleTime: DETAIL_STALE_MS,
  });
