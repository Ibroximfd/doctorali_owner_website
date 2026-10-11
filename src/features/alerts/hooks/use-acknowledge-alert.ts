"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { acknowledgeAlert } from "../api/alerts.api";

/** "Ko'rildi": signal sanog'i boshqa bo'limlarda ham ko'rinadi — hammasi yangilanadi. */
export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acknowledgeAlert,
    // Ochiq signallar boshqa ekranlarda ham bor (Umumiy, qobiq belgisi) — faol so'rovlar yangilanadi.
    onSuccess: () => void queryClient.invalidateQueries(),
  });
};
