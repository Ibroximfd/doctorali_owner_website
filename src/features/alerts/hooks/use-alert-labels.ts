"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatPercent } from "@/shared/lib/format";

import { formatThreshold, ruleMessageKey } from "../model/alerts.rules";
import type { AlertRule } from "../model/alerts.schema";

/**
 * Signal kodlari va toifalari ochiq ro'yxat: backend yangi qoida qo'shsa ekran
 * yiqilmaydi — tarjimasi bo'lmagan qiymat o'zicha ko'rsatiladi.
 */
export const useRuleLabel = () => {
  const t = useTranslations("alerts.rules");
  return (code: string): string => {
    const key = ruleMessageKey(code);
    return t.has(key) ? t(key) : code;
  };
};

export const useCategoryLabel = () => {
  const t = useTranslations("alerts.category");
  return (category: string): string => (t.has(category) ? t(category) : category);
};

/** O'lchov birligi yozuvi (chegara maydoni yonida): "soat", "so'm", "%" … */
export const useUnitLabel = () => {
  const t = useTranslations("alerts.unit");
  const { currency } = useFormat();
  return (unit: AlertRule["unit"]): string => (unit === "uzs" ? currency : t(unit));
};

/** Chegara birligi bilan: "3 soat", "5,0 mln so'm", "15%", "10 ta". */
export const useThresholdLabel = () => {
  const t = useTranslations("alerts.threshold");
  const format = useFormat();

  return ({ unit, params }: Pick<AlertRule, "unit" | "params">): string => {
    const value = params.threshold;
    if (unit === "uzs") return format.money(value);
    if (unit === "pct") return formatPercent(value, Number.isInteger(value) ? 0 : 1);
    return t(unit, { value: formatThreshold(value) });
  };
};
