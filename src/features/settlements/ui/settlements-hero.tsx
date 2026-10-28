"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { SettlementsArt } from "@/shared/ui/illustrations/section-art";
import { AnimatedNumber } from "@/shared/ui/motion/animated-number";
import { HeroStat, SectionHero } from "@/shared/ui/section-hero";

import { useSettlementsSummaryQuery } from "../hooks/use-settlements";

/** Bo'lim boshi: olinishi kerak bo'lgan pul, uning kechikkan qismi va qarzdor hududlar. */
export const SettlementsHero = () => {
  const t = useTranslations("settlements");
  const format = useFormat();
  const summary = useSettlementsSummaryQuery().data?.data;

  return (
    <SectionHero
      eyebrow={t("hero.eyebrow")}
      title={t("title")}
      description={t("description")}
      art={<SettlementsArt />}
    >
      {summary ? (
        <>
          <HeroStat
            label={t("hero.receivable")}
            value={<AnimatedNumber value={summary.receivable} format={format.moneyCompact} />}
          />
          <HeroStat
            label={t("hero.overdue")}
            tone={summary.overdue > 0 ? "alert" : "default"}
            value={<AnimatedNumber value={summary.overdue} format={format.moneyCompact} />}
          />
          <HeroStat
            label={t("hero.regions")}
            value={<AnimatedNumber value={summary.regionsInDebt} format={formatNumber} />}
          />
        </>
      ) : null}
    </SectionHero>
  );
};
