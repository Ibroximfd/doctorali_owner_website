"use client";

import { useQuery } from "@tanstack/react-query";

import { useScopeQuery } from "@/shared/hooks/use-scope";

import {
  loadAppConsultations,
  loadAppDevices,
  loadAppEngagement,
  loadAppFunnels,
  loadAppLoyalty,
  loadAppSummary,
  loadAppTimeseries,
  loadDoctorApp,
} from "../api/mobile-app.api";
import type { AppTimeseriesMetric } from "../model/mobile-app.schema";

type ScopeKey = readonly string[];

export const mobileAppKeys = {
  all: ["mobile-app"] as const,
  summary: (scope: ScopeKey) => [...mobileAppKeys.all, "summary", ...scope] as const,
  timeseries: (metric: AppTimeseriesMetric, scope: ScopeKey) =>
    [...mobileAppKeys.all, "timeseries", metric, ...scope] as const,
  devices: (scope: ScopeKey) => [...mobileAppKeys.all, "devices", ...scope] as const,
  consultations: (scope: ScopeKey) => [...mobileAppKeys.all, "consultations", ...scope] as const,
  engagement: (scope: ScopeKey) => [...mobileAppKeys.all, "engagement", ...scope] as const,
  loyalty: (scope: ScopeKey) => [...mobileAppKeys.all, "loyalty", ...scope] as const,
  doctorApp: (scope: ScopeKey) => [...mobileAppKeys.all, "doctor-app", ...scope] as const,
  funnels: (scope: ScopeKey) => [...mobileAppKeys.all, "funnels", ...scope] as const,
};

export const useAppSummaryQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: mobileAppKeys.summary(key),
    queryFn: () => loadAppSummary(params),
    ...options,
  });
};

export const useAppTimeseriesQuery = (metric: AppTimeseriesMetric) => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: mobileAppKeys.timeseries(metric, key),
    queryFn: () => loadAppTimeseries(metric, params),
    ...options,
  });
};

export const useAppDevicesQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: mobileAppKeys.devices(key),
    queryFn: () => loadAppDevices(params),
    ...options,
  });
};

export const useAppConsultationsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: mobileAppKeys.consultations(key),
    queryFn: () => loadAppConsultations(params),
    ...options,
  });
};

export const useAppEngagementQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: mobileAppKeys.engagement(key),
    queryFn: () => loadAppEngagement(params),
    ...options,
  });
};

export const useAppLoyaltyQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: mobileAppKeys.loyalty(key),
    queryFn: () => loadAppLoyalty(params),
    ...options,
  });
};

export const useDoctorAppQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: mobileAppKeys.doctorApp(key),
    queryFn: () => loadDoctorApp(params),
    ...options,
  });
};

/** Tasdiqlash va bekor qilish voronkalari bitta javobda — ikkala karta shu so'rovni bo'lishadi. */
export const useAppFunnelsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: mobileAppKeys.funnels(key),
    queryFn: () => loadAppFunnels(params),
    ...options,
  });
};
