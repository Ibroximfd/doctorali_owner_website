"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { QueryState, StatRowSkeleton } from "@/shared/ui/states";
import { pointChange } from "@/shared/lib/envelope";

import { useSalesSummaryQuery } from "../hooks/use-sales";

/** Oxirgi ikki katak — hozirgi holat: davrga bog'liq emas, shuning uchun o'zgarish belgisi yo'q. */
export const SalesKpis = () => {
  const t = useTranslations("sales.kpi");
  const format = useFormat();
  const query = useSalesSummaryQuery();

  return (
    <QueryState query={query} skeleton={<StatRowSkeleton />}>
      {({ data: { sparklines, ...kpi } }) => (
        <StatRow>
          <StatTile
            label={t("leads")}
            value={formatNumber(kpi.leads.value)}
            delta={kpi.leads.deltaPct}
            sparkline={sparklines.leads}
          />
          <StatTile
            label={t("conversion")}
            value={formatPercent(kpi.conversion.value)}
            delta={pointChange(kpi.conversion)}
            deltaUnit="pp"
            sparkline={sparklines.conversion}
          />
          <StatTile
            label={t("salesAmount")}
            value={format.moneyCompact(kpi.salesAmount.value)}
            unit={format.currency}
            delta={kpi.salesAmount.deltaPct}
            sparkline={sparklines.salesAmount}
          />
          <StatTile
            label={t("calls")}
            value={formatNumber(kpi.callsTotal.value)}
            delta={kpi.callsTotal.deltaPct}
            sparkline={sparklines.callsTotal}
          />
          <StatTile
            label={t("missedUnhandled")}
            value={formatNumber(kpi.callsMissedUnhandled.value)}
            note={t("missedUnhandledNote")}
          />
          <StatTile
            label={t("activitiesOverdue")}
            value={formatNumber(kpi.activitiesOverdue.value)}
            note={t("activitiesOverdueNote")}
          />
        </StatRow>
      )}
    </QueryState>
  );
};
