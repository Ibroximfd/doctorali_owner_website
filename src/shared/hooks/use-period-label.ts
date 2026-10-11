"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "./use-format";
import { useScope } from "./use-scope";

/** Tanlangan davrning to'liq nomi: "Oxirgi 30 kun", "01.09.2026 – 30.09.2026". */
export const usePeriodLabel = (): string => {
  const t = useTranslations("scope");
  const { scope } = useScope();
  const format = useFormat();

  if (scope.period === "custom" && scope.from && scope.to) {
    return `${format.date(`${scope.from}T12:00:00+05:00`)} – ${format.date(`${scope.to}T12:00:00+05:00`)}`;
  }
  return t(`periodLong.${scope.period}`);
};
