"use client";

import { skipToken, useQuery } from "@tanstack/react-query";

import { useScopeQuery } from "@/shared/hooks/use-scope";

import {
  loadAttemptReasons,
  loadCourier,
  loadCouriers,
  loadDeliveryTimeseries,
  loadLogisticsSummary,
  loadRegionDelivery,
  loadTransfers,
} from "../api/logistics.api";

export const logisticsKeys = {
  all: ["logistics"] as const,
  summary: (scope: readonly string[]) => [...logisticsKeys.all, "summary", ...scope] as const,
  couriers: (scope: readonly string[]) => [...logisticsKeys.all, "couriers", ...scope] as const,
  courier: (id: number | null, scope: readonly string[]) =>
    [...logisticsKeys.all, "courier", id, ...scope] as const,
  timeseries: (scope: readonly string[]) => [...logisticsKeys.all, "timeseries", ...scope] as const,
  regions: (scope: readonly string[]) => [...logisticsKeys.all, "regions", ...scope] as const,
  attemptReasons: (scope: readonly string[]) => [...logisticsKeys.all, "attempt-reasons", ...scope] as const,
  transfers: (scope: readonly string[]) => [...logisticsKeys.all, "transfers", ...scope] as const,
};

export const useLogisticsSummaryQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: logisticsKeys.summary(key),
    queryFn: () => loadLogisticsSummary(params),
    ...options,
  });
};

export const useCouriersQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: logisticsKeys.couriers(key), queryFn: () => loadCouriers(params), ...options });
};

/**
 * Bitta kuryer kartasi. So'rov faqat karta ochiq (`enabled`) va `id` bor bo'lganda
 * ketadi. Oldingi natija ushlab turilmaydi (`placeholderData` yo'q) — boshqa kuryer
 * ochilganda avvalgisining raqamlari ko'rinib qolmasin.
 */
export const useCourierQuery = (id: number | null, enabled: boolean) => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: logisticsKeys.courier(id, key),
    queryFn: id === null ? skipToken : () => loadCourier(id, params),
    enabled,
    staleTime: options.staleTime,
    refetchInterval: options.refetchInterval,
  });
};

export const useDeliveryTimeseriesQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: logisticsKeys.timeseries(key),
    queryFn: () => loadDeliveryTimeseries(params),
    ...options,
  });
};

export const useRegionDeliveryQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: logisticsKeys.regions(key),
    queryFn: () => loadRegionDelivery(params),
    ...options,
  });
};

export const useAttemptReasonsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: logisticsKeys.attemptReasons(key),
    queryFn: () => loadAttemptReasons(params),
    ...options,
  });
};

export const useTransfersQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: logisticsKeys.transfers(key),
    queryFn: () => loadTransfers(params),
    ...options,
  });
};
