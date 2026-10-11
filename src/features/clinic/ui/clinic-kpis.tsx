"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { QueryState, StatRowSkeleton } from "@/shared/ui/states";
import { pointChange } from "@/shared/lib/envelope";

import { useClinicSummaryQuery } from "../hooks/use-clinic";

export const ClinicKpis = () => {
  const t = useTranslations("clinic.kpi");
  const format = useFormat();
  const query = useClinicSummaryQuery();

  return (
    <QueryState query={query} skeleton={<StatRowSkeleton />}>
      {({ data: summary }) => (
        <StatRow>
          <StatTile
            label={t("revenue")}
            value={format.moneyCompact(summary.revenue.value)}
            unit={format.currency}
            delta={summary.revenue.deltaPct}
            sparkline={summary.sparklines.revenue}
          />
          <StatTile
            label={t("visits")}
            value={formatNumber(summary.visitsArrived.value)}
            delta={summary.visitsArrived.deltaPct}
            sparkline={summary.sparklines.visitsArrived}
          />
          <StatTile
            label={t("noShow")}
            value={formatPercent(summary.noShowRate?.value)}
            delta={summary.noShowRate ? pointChange(summary.noShowRate) : null}
            deltaUnit="pp"
            invertDelta
            sparkline={summary.sparklines.noShowRate}
          />
          <StatTile
            label={t("treatments")}
            value={formatNumber(summary.treatments.value)}
            delta={summary.treatments.deltaPct}
            sparkline={summary.sparklines.treatments}
          />
          <StatTile
            label={t("consultations")}
            value={formatNumber(summary.consultations.value)}
            delta={summary.consultations.deltaPct}
            sparkline={summary.sparklines.consultations}
          />
          <StatTile
            label={t("avgCheck")}
            value={formatNumber(summary.avgCheck?.value)}
            unit={summary.avgCheck ? format.currency : undefined}
            delta={summary.avgCheck?.deltaPct ?? null}
            sparkline={summary.sparklines.avgCheck}
          />
        </StatRow>
      )}
    </QueryState>
  );
};
