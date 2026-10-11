"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useScope, useScopeQuery } from "@/shared/hooks/use-scope";

import {
  loadClinicBranches,
  loadClinicDoctors,
  loadClinicRevenueMix,
  loadClinicSummary,
  loadClinicWarehouse,
} from "../api/clinic.api";

export const clinicKeys = {
  all: ["clinic"] as const,
  summary: (scope: readonly string[]) => [...clinicKeys.all, "summary", ...scope] as const,
  revenueMix: (scope: readonly string[]) => [...clinicKeys.all, "revenue-mix", ...scope] as const,
  branches: (scope: readonly string[]) => [...clinicKeys.all, "branches", ...scope] as const,
  doctors: (scope: readonly string[]) => [...clinicKeys.all, "doctors", ...scope] as const,
  warehouse: (filial: string) => [...clinicKeys.all, "warehouse", filial] as const,
};

export const useClinicSummaryQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: clinicKeys.summary(key),
    queryFn: () => loadClinicSummary(params),
    ...options,
  });
};

export const useClinicRevenueMixQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: clinicKeys.revenueMix(key),
    queryFn: () => loadClinicRevenueMix(params),
    ...options,
  });
};

export const useClinicBranchesQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: clinicKeys.branches(key),
    queryFn: () => loadClinicBranches(params),
    ...options,
  });
};

export const useClinicDoctorsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: clinicKeys.doctors(key),
    queryFn: () => loadClinicDoctors(params),
    ...options,
  });
};

const WAREHOUSE_REFRESH_MS = 60_000;

/** Ombor — hozirgi holat: davrga bog'liq emas, faqat tanlangan filiallarga (`filial=1,2`; bo'sh — hammasi). */
export const useClinicWarehouseQuery = () => {
  const { scope } = useScope();
  const filial = [...scope.filials].sort((first, second) => first - second).join(",");

  return useQuery({
    queryKey: clinicKeys.warehouse(filial),
    queryFn: () => loadClinicWarehouse({ filial }),
    staleTime: WAREHOUSE_REFRESH_MS,
    refetchInterval: WAREHOUSE_REFRESH_MS,
    placeholderData: keepPreviousData,
  });
};
