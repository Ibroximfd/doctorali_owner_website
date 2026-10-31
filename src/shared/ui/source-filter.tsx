"use client";

import { useTranslations } from "next-intl";

import { ORDER_SOURCE_FILTERS, useOrderSource } from "@/shared/hooks/use-order-source";

import { Segmented } from "./segmented";

/** «Hammasi · Ilovadan · Operatordan» — sahifa sarlavhasi yonida. */
export const SourceFilter = () => {
  const t = useTranslations("common.source");
  const [source, setSource] = useOrderSource();
  return (
    <Segmented
      ariaLabel={t("label")}
      value={source}
      onChange={(next) => void setSource(next === "all" ? null : next)}
      options={ORDER_SOURCE_FILTERS.map((value) => ({ value, label: t(value) }))}
    />
  );
};
