"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { loadSessions, revokeSession } from "../api/settings.api";
import type { Session } from "../model/settings.schema";

export const settingsKeys = {
  all: ["settings"] as const,
  sessions: () => [...settingsKeys.all, "sessions"] as const,
};

/** Sessiyalar ro'yxati tez eskiradi — boshqa qurilmadan kirilgan bo'lishi mumkin. */
const SESSIONS_STALE_MS = 60_000;

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
