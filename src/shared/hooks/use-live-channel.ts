"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { env } from "@/shared/config/env";
import { authGet } from "@/shared/lib/http";
import { openLiveChannel } from "@/shared/lib/live-channel";

/** Hodisalar ketma-ket kelsa ham ekran bir marta yangilanadi. */
const REFRESH_DEBOUNCE_MS = 2000;

/**
 * Jonli kanal ulangan bo'lsa (haqiqiy backend + `NEXT_PUBLIC_WS_URL`), hodisa
 * kelishi bilan faol so'rovlarni yangilaydi. Namuna rejimida kanal yo'q —
 * ma'lumot odatdagi davriy so'rov bilan yangilanadi.
 */
export const useLiveChannel = (): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (env.wsUrl === null) return;

    let pending: ReturnType<typeof setTimeout> | undefined;
    const refreshSoon = () => {
      if (pending !== undefined) return;
      pending = setTimeout(() => {
        pending = undefined;
        void queryClient.invalidateQueries();
      }, REFRESH_DEBOUNCE_MS);
    };

    const close = openLiveChannel({
      url: env.wsUrl,
      loadTicket: () => authGet("ws-ticket"),
      onEvent: refreshSoon,
    });
    return () => {
      clearTimeout(pending);
      close();
    };
  }, [queryClient]);
};
