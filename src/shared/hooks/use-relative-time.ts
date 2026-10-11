"use client";

import { useTranslations } from "next-intl";

const MINUTE_MS = 60_000;

/** `2026-10-02T11:00:00Z` → "3 soat" (daqiqa / soat / kun). Kelajak sanalar "hozir" bo'ladi. */
export const useRelativeTime = () => {
  const t = useTranslations("common.ago");

  return (iso: string, now: number = Date.now()): string => {
    const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / MINUTE_MS));
    if (minutes < 1) return t("now");
    if (minutes < 60) return t("minutes", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("hours", { count: hours });
    return t("days", { count: Math.floor(hours / 24) });
  };
};
