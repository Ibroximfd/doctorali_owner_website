"use client";

import { useQuery } from "@tanstack/react-query";

import { useScopeQuery } from "@/shared/hooks/use-scope";

import { loadDoctors, loadDoctorsSummary } from "../api/doctors.api";

export const doctorKeys = {
  all: ["doctors"] as const,
  summary: (scope: readonly string[]) => [...doctorKeys.all, "summary", ...scope] as const,
  list: (scope: readonly string[]) => [...doctorKeys.all, "list", ...scope] as const,
};

export const useDoctorsSummaryQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: doctorKeys.summary(key),
    queryFn: () => loadDoctorsSummary(params),
    ...options,
  });
};

export const useDoctorsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: doctorKeys.list(key), queryFn: () => loadDoctors(params), ...options });
};
