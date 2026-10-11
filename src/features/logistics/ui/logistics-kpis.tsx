"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { QueryState, StatRowSkeleton } from "@/shared/ui/states";
import { pointChange } from "@/shared/lib/envelope";

import { useLogisticsSummaryQuery } from "../hooks/use-logistics";

/** Birinchi va oxirgi katak — hozirgi holat (taqqoslashsiz); o'rtadagilar — tanlangan davr. */
export const LogisticsKpis = () => {
  const t = useTranslations("logistics.kpi");
  const format = useFormat();
  const query = useLogisticsSummaryQuery();

  return (
    <QueryState query={query} skeleton={<StatRowSkeleton />}>
      {({ data: summary }) => (
        <StatRow>
          <StatTile
            label={t("inTransit")}
            value={formatNumber(summary.inTransitNow)}
            note={t("late", { count: summary.lateNow })}
          />
          <StatTile
            label={t("delivered")}
            value={formatNumber(summary.delivered.value)}
            delta={summary.delivered.deltaPct}
            sparkline={summary.sparklines.delivered}
          />
          <StatTile
            label={t("successRate")}
            value={formatPercent(summary.successRate?.value)}
            delta={summary.successRate ? pointChange(summary.successRate) : null}
            deltaUnit="pp"
            sparkline={summary.sparklines.successRate}
          />
          <StatTile
            label={t("avgTime")}
            value={format.duration(summary.avgDeliveryMinutes?.value)}
            delta={summary.avgDeliveryMinutes?.deltaPct ?? null}
            invertDelta
            sparkline={summary.sparklines.avgDeliveryMinutes}
          />
          <StatTile
            label={t("attempts")}
            value={formatNumber(summary.attempts.value)}
            delta={summary.attempts.deltaPct}
            invertDelta
            sparkline={summary.sparklines.attempts}
          />
          <StatTile
            label={t("codUnsettled")}
            value={format.moneyCompact(summary.codUnsettled)}
            unit={format.currency}
            note={t("codCouriers", { count: summary.codUnsettledCouriers })}
          />
        </StatRow>
      )}
    </QueryState>
  );
};
