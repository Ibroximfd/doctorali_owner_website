"use client";

import { useQuery } from "@tanstack/react-query";

import { loadAudit, loadHealth, loadSync } from "../api/system.api";

const HEALTH_MS = 30_000;

export const systemKeys = {
  all: ["system"] as const,
  health: () => [...systemKeys.all, "health"] as const,
  sync: () => [...systemKeys.all, "sync"] as const,
  audit: (page: number) => [...systemKeys.all, "audit", page] as const,
};

/** Tizim holati jonli: yarim daqiqada yangilanadi. */
export const useHealthQuery = () =>
  useQuery({ queryKey: systemKeys.health(), queryFn: loadHealth, refetchInterval: HEALTH_MS });

export const useSyncQuery = () =>
  useQuery({ queryKey: systemKeys.sync(), queryFn: loadSync, refetchInterval: 60_000 });

export const useAuditQuery = (page: number) =>
  useQuery({
    queryKey: systemKeys.audit(page),
    queryFn: () => loadAudit(page),
    placeholderData: (previous) => previous,
  });
