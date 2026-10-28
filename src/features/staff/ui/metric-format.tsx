"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatDecimal, formatNumber, formatPercent } from "@/shared/lib/format";

/** Qiymat birligiga qarab formatlash (`count · pct · uzs · min · rating`); noma'lum birlik — oddiy son. */
export const useMetricFormat = () => {
  const format = useFormat();
  return (value: number | null, unit: string): string => {
    if (value === null) return "—";
    switch (unit) {
      case "pct":
        return formatPercent(value);
      case "uzs":
        return format.moneyCompact(value);
      case "min":
        return format.duration(value);
      case "rating":
        return formatDecimal(value);
      default:
        return formatNumber(value);
    }
  };
};

/** Ustun sarlavhasi: ma'lum kalit — tarjima, yangisi — kalitning o'zi. */
export const useMetricLabel = () => {
  const t = useTranslations("staff.metrics");
  return (key: string): string => (t.has(key) ? t(key) : key);
};
