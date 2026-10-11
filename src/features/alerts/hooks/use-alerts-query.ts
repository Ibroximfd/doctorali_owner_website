"use client";

import { useQuery } from "@tanstack/react-query";

import { loadAlerts } from "../api/alerts.api";
import { alertKeys } from "./alert-keys";

const ALERTS_REFRESH_MS = 60_000;

/** Signallar jonli: har daqiqada yangilanadi (tab ko'rinib turganda). */
export const useAlertsQuery = () =>
  useQuery({
    queryKey: alertKeys.list(),
    queryFn: loadAlerts,
    staleTime: ALERTS_REFRESH_MS,
    refetchInterval: ALERTS_REFRESH_MS,
  });

/** Qobiqdagi belgi uchun: faqat ochiq signallar soni (qolgani o'zgarsa qayta chizilmaydi). */
export const useOpenAlertsCount = (): number => {
  const { data } = useQuery({
    queryKey: alertKeys.list(),
    queryFn: loadAlerts,
    staleTime: ALERTS_REFRESH_MS,
    refetchInterval: ALERTS_REFRESH_MS,
    select: (response) => response.counts.open,
  });
  return data ?? 0;
};
