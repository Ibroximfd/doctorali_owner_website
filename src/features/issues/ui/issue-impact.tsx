"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";

import type { Issue } from "../model/issues.schema";

/** Muammoning ta'siri o'z birligida: pul, buyurtma, dona yoki vaqt. */
export const useImpactLabel = () => {
  const t = useTranslations("issues.impact");
  const format = useFormat();
  return (impact: Issue["impact"]): string | null => {
    if (impact === null) return null;
    switch (impact.kind) {
      case "money":
        return t("money", { value: format.moneyCompact(impact.value), currency: format.currency });
      case "orders":
        return t("orders", { count: impact.value, value: formatNumber(impact.value) });
      case "units":
        return t("units", { value: formatNumber(impact.value) });
      case "minutes":
        return t("minutes", { value: format.duration(impact.value) });
      default:
        return formatNumber(impact.value);
    }
  };
};

/** Kartadagi qisqa summa: faqat qiymat va birlik («4,2 mln», «23 ta», «240 dona»). */
export const useImpactValue = () => {
  const t = useTranslations("issues.impactShort");
  const format = useFormat();
  return (impact: Issue["impact"]): string | null => {
    if (impact === null) return null;
    switch (impact.kind) {
      case "money":
        return format.moneyCompact(impact.value);
      case "orders":
        return t("orders", { value: formatNumber(impact.value) });
      case "units":
        return t("units", { value: formatNumber(impact.value) });
      case "minutes":
        return format.duration(impact.value);
      default:
        return formatNumber(impact.value);
    }
  };
};
