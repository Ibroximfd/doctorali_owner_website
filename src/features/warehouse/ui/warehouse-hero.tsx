"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatDecimal, formatNumber } from "@/shared/lib/format";
import { WarehouseArt } from "@/shared/ui/illustrations/section-art";
import { AnimatedNumber } from "@/shared/ui/motion/animated-number";
import { HeroStat, SectionHero } from "@/shared/ui/section-hero";

import { useWarehouseSummaryQuery } from "../hooks/use-warehouse";

/** Bo'lim boshi: qoldiq qiymati, necha kunga yetishi va muammoli mahsulotlar — bir qarashda. */
export const WarehouseHero = () => {
  const t = useTranslations("warehouse");
  const format = useFormat();
  const summary = useWarehouseSummaryQuery().data?.data;

  return (
    <SectionHero
      eyebrow={t("hero.eyebrow")}
      title={t("title")}
      description={t("description")}
      art={<WarehouseArt />}
    >
      {summary ? (
        <>
          <HeroStat
            label={t("hero.value")}
            value={<AnimatedNumber value={summary.stockValue} format={format.moneyCompact} />}
          />
          <HeroStat
            label={t("hero.cover")}
            value={
              summary.daysOfCover === null
                ? "—"
                : t("hero.days", { value: formatDecimal(summary.daysOfCover) })
            }
          />
          <HeroStat
            label={t("hero.problems")}
            tone={summary.outSkus + summary.lowSkus > 0 ? "alert" : "default"}
            value={<AnimatedNumber value={summary.outSkus + summary.lowSkus} format={formatNumber} />}
          />
        </>
      ) : null}
    </SectionHero>
  );
};
