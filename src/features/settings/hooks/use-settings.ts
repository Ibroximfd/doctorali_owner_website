"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { loadAccess, loadSessions, loadTargets, revokeSession, saveTargets } from "../api/settings.api";
import type { Session } from "../model/settings.schema";

export const settingsKeys = {
  all: ["settings"] as const,
  targets: (month: string) => [...settingsKeys.all, "targets", month] as const,
  sessions: () => [...settingsKeys.all, "sessions"] as const,
  access: () => [...settingsKeys.all, "access"] as const,
};

/** Sozlamalar davrga bog'liq emas va kam o'zgaradi; sessiyalar ro'yxati tezroq eskiradi. */
const SETTINGS_STALE_MS = 5 * 60_000;
const SESSIONS_STALE_MS = 60_000;

export const useTargetsQuery = (month: string) =>
  useQuery({
    queryKey: settingsKeys.targets(month),
    queryFn: () => loadTargets(month),
    staleTime: SETTINGS_STALE_MS,
  });

export const useSaveTargets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveTargets,
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsKeys.targets(saved.month), saved);
      // Reja boshqa bo'limlardagi ko'rsatkichlarga kiradi («Umumiy» dagi reja chizig'i): keshdagi
      // ekranlar eskirgan deb belgilanadi va keyingi ochilishda yangilanadi — hozir hech narsa so'ralmaydi.
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== settingsKeys.all[0],
        refetchType: "none",
      });
    },
  });
};

export const useSessionsQuery = () =>
  useQuery({ queryKey: settingsKeys.sessions(), queryFn: loadSessions, staleTime: SESSIONS_STALE_MS });

export const useRevokeSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeSession,
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Session[]>(settingsKeys.sessions(), (sessions) =>
        sessions?.filter((session) => session.id !== id),
      );
      void queryClient.invalidateQueries({ queryKey: settingsKeys.sessions() });
    },
  });
};

export const useAccessQuery = () =>
  useQuery({ queryKey: settingsKeys.access(), queryFn: loadAccess, staleTime: SETTINGS_STALE_MS });
