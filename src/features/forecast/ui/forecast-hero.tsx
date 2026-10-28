"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { formatPercent } from "@/shared/lib/format";
import { ForecastArt } from "@/shared/ui/illustrations/section-art";
import { AnimatedNumber } from "@/shared/ui/motion/animated-number";
import { HeroStat, SectionHero } from "@/shared/ui/section-hero";
import { Segmented } from "@/shared/ui/segmented";

import { useForecastSummaryQuery, useHorizon } from "../hooks/use-forecast";
import { HORIZONS, type Horizon } from "../model/forecast.rules";

const toHorizon = (value: string): Horizon => HORIZONS.find((days) => String(days) === value) ?? 30;

/**
 * Bo'lim boshi: ufq tanlovi, tahririy jumla (kutilgan tushum, o'zgarish, ishonch oralig'i),
 * model aniqligi va reja bajarilishi.
 */
export const ForecastHero = () => {
  const t = useTranslations("forecast");
  const format = useFormat();
  const { horizon, setHorizon } = useHorizon();
  const summary = useForecastSummaryQuery().data?.data;
  const strong = (chunks: ReactNode) => <span className="text-mint">{chunks}</span>;

  const description = summary
    ? t.rich(summary.revenue.changePct === null ? "hero.sentenceFlat" : "hero.sentence", {
        count: summary.horizonDays,
        value: format.moneyCompact(summary.revenue.expected),
        currency: format.currency,
        change: `${(summary.revenue.changePct ?? 0) >= 0 ? "+" : ""}${formatPercent(summary.revenue.changePct)}`,
        low: format.moneyCompact(summary.revenue.low),
        high: format.moneyCompact(summary.revenue.high),
        strong,
        delta: (chunks) => (
          <span className={(summary.revenue.changePct ?? 0) >= 0 ? "text-good" : "text-crit"}>{chunks}</span>
        ),
      })
    : t("description");

  return (
    <SectionHero
      eyebrow={t("hero.eyebrow")}
      title={t("title")}
      description={description}
      art={<ForecastArt />}
    >
      <div className="w-full">
        <Segmented
          tone="hero"
          ariaLabel={t("hero.horizon")}
          value={String(horizon)}
          onChange={(value) => setHorizon(toHorizon(value))}
          options={HORIZONS.map((days) => ({ value: String(days), label: t("hero.days", { count: days }) }))}
        />
      </div>
      {summary ? (
        <>
          <HeroStat
            label={t("hero.revenue", { count: summary.horizonDays })}
            value={<AnimatedNumber value={summary.revenue.expected} format={format.moneyCompact} />}
          />
          <HeroStat label={t("hero.accuracy")} value={formatPercent(summary.accuracyPct)} />
          {summary.plan ? (
            <HeroStat
              label={t("hero.plan")}
              tone={summary.plan.expectedPct < 100 ? "alert" : "default"}
              value={formatPercent(summary.plan.expectedPct)}
            />
          ) : null}
        </>
      ) : null}
    </SectionHero>
  );
};
