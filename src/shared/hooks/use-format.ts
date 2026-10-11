"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";

import {
  currencyLabel,
  formatBucket,
  formatDate,
  formatDateTime,
  formatDuration,
  formatLongDate,
  formatMoney,
  formatMoneyCompact,
  formatMonth,
  formatTime,
  type FormatLocale,
  type Granularity,
} from "@/shared/lib/format";

const toFormatLocale = (locale: string): FormatLocale => (locale === "ru" ? "ru" : "uz");

/** Joriy tilga bog'langan formatlovchilar (birlik yozuvlari tilga qarab o'zgaradi). */
export const useFormat = () => {
  const locale = toFormatLocale(useLocale());

  return useMemo(
    () => ({
      locale,
      currency: currencyLabel(locale),
      money: (value: number | null | undefined) => formatMoney(value, locale),
      moneyCompact: (value: number | null | undefined) => formatMoneyCompact(value, locale),
      duration: (minutes: number | null | undefined) => formatDuration(minutes, locale),
      time: (iso: string) => formatTime(iso, locale),
      date: (iso: string) => formatDate(iso, locale),
      longDate: (iso: string) => formatLongDate(iso, locale),
      month: (yearMonth: string) => formatMonth(yearMonth, locale),
      dateTime: (iso: string) => formatDateTime(iso, locale),
      bucket: (label: string, granularity: Granularity) => formatBucket(label, granularity, locale),
    }),
    [locale],
  );
};
