"use client";

import { Target } from "lucide-react";
import { useTranslations } from "next-intl";

import { seriesBg } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { usePeriodLabel } from "@/shared/hooks/use-period-label";
import { cn } from "@/shared/lib/cn";
import { formatDecimal, formatPercent } from "@/shared/lib/format";
import { Card } from "@/shared/ui/card";
import { Meter } from "@/shared/ui/meter";
import { MetricDelta } from "@/shared/ui/metric-delta";
import { MiniStats } from "@/shared/ui/mini-stats";
import { StackedBar } from "@/shared/ui/stacked-bar";
import { BlockSkeleton, QueryState } from "@/shared/ui/states";

import { useOverviewQuery } from "../hooks/use-overview";
import { activeChannels, planPace } from "../model/overview.rules";
import type { Overview } from "../model/overview.schema";

/** Sahifaning yagona katta raqami: jami tushum, oylik reja va kanallar bo'yicha tarkib. */
export const RevenueHero = ({ className }: { className?: string }) => {
  const query = useOverviewQuery();

  return (
    <Card className={cn("p-4 md:p-5.5", className)}>
      <QueryState query={query} skeleton={<BlockSkeleton className="h-72" />}>
        {({ data }) => <HeroContent overview={data} />}
      </QueryState>
    </Card>
  );
};

const HeroContent = ({ overview }: { overview: Overview }) => {
  const t = useTranslations("overview");
  const format = useFormat();
  const periodLabel = usePeriodLabel();
  const { revenue, plan, revenueQuick } = overview;
  const total = revenue.total;

  return (
    <>
      <div className="flex flex-wrap items-start gap-4">
        <div>
          <div className="text-ink-2 text-sm font-medium">
            {t("hero.label")} · {periodLabel.toLowerCase()}
          </div>
          <div className="text-hero font-strong mt-1.5 tracking-tighter whitespace-nowrap">
            {format.moneyCompact(total.value)}
            <span className="text-ink-3 ml-1.5 text-lg font-medium tracking-normal">{format.currency}</span>
          </div>
          <div className="text-ink-3 mt-2.5 flex flex-wrap items-center gap-2 text-xs">
            <MetricDelta value={total.deltaPct} />
            <span>
              {total.previous === null
                ? t("hero.composition")
                : t("hero.previous", { value: format.money(total.previous) })}
            </span>
          </div>
        </div>
        {plan ? <PlanProgress plan={plan} /> : null}
      </div>

      <StackedBar
        className="mt-5"
        legend="block"
        ariaLabel={t("hero.channelsLabel")}
        format={format.moneyCompact}
        items={activeChannels(revenue).map((channel) => ({
          key: channel.key,
          label: t(`channels.${channel.key}`),
          value: channel.value,
          colorClassName: seriesBg(channel.colorIndex),
        }))}
      />

      <MiniStats
        className="mt-4.5 border-t pt-4"
        items={[
          {
            key: "today",
            label: t("quick.today"),
            value: format.moneyCompact(revenueQuick.today),
            unit: format.currency,
            note: t("quick.todayNote", { value: format.moneyCompact(revenueQuick.todaySameTimeYesterday) }),
          },
          {
            key: "yesterday",
            label: t("quick.yesterday"),
            value: format.moneyCompact(revenueQuick.yesterday),
            unit: format.currency,
          },
          {
            key: "week",
            label: t("quick.week"),
            value: format.moneyCompact(revenueQuick.week),
            unit: format.currency,
            note: t("quick.weekNote"),
          },
          {
            key: "month",
            label: plan ? format.month(plan.month) : t("quick.month"),
            value: format.moneyCompact(revenueQuick.month),
            unit: format.currency,
            note: t("quick.monthNote"),
          },
        ]}
      />
    </>
  );
};

const PlanProgress = ({ plan }: { plan: NonNullable<Overview["plan"]> }) => {
  const t = useTranslations("overview.plan");
  const format = useFormat();
  const pace = planPace(plan);

  return (
    <div className="w-full text-xs md:ml-auto md:w-84">
      <div className="text-ink-2 flex items-center gap-2">
        <Target aria-hidden className="size-3.5" />
        <span className="flex-1">{t("title", { month: format.month(plan.month) })}</span>
        <span className="num font-strong text-ink whitespace-nowrap">
          {format.moneyCompact(plan.actual)} / {format.moneyCompact(plan.target)}
        </span>
      </div>
      <Meter
        className="mt-2 mb-1.5"
        value={plan.pct}
        marker={plan.expectedPct}
        ariaLabel={t("meterLabel", {
          pct: formatPercent(plan.pct),
          expected: formatPercent(plan.expectedPct),
        })}
      />
      <div className="text-ink-2 flex justify-between gap-2">
        <span>
          <span className="font-strong text-ink">{formatPercent(plan.pct)}</span> {t("done")}
        </span>
        <span className="text-ink-3">
          {t(pace.isAhead ? "ahead" : "behind", { gap: formatDecimal(pace.gap) })}
        </span>
      </div>
      {plan.previous ? (
        <div className="mt-2 flex justify-between gap-2 border-t pt-2">
          <span className="text-ink-3">{t("previous", { month: format.month(plan.previous.month) })}</span>
          <span className="num whitespace-nowrap">
            <span className="font-strong">{formatPercent(plan.previous.pct)}</span> ·{" "}
            {format.moneyCompact(plan.previous.actual)} / {format.moneyCompact(plan.previous.target)}
          </span>
        </div>
      ) : null}
    </div>
  );
};
