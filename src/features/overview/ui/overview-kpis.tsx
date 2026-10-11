"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { QueryState, StatRowSkeleton } from "@/shared/ui/states";
import { pointChange } from "@/shared/lib/envelope";

import { useOverviewQuery } from "../hooks/use-overview";

export const OverviewKpis = () => {
  const t = useTranslations("overview.kpi");
  const format = useFormat();
  const query = useOverviewQuery();

  return (
    <QueryState query={query} skeleton={<StatRowSkeleton />}>
      {({ data: { kpis, sparklines } }) => (
        <StatRow>
          <StatTile
            label={t("orders")}
            value={formatNumber(kpis.orders.value)}
            delta={kpis.orders.deltaPct}
            sparkline={sparklines.orders}
          />
          <StatTile
            label={t("deliveryRate")}
            value={formatPercent(kpis.deliveryRate.value)}
            delta={pointChange(kpis.deliveryRate)}
            deltaUnit="pp"
            sparkline={sparklines.deliveryRate}
          />
          <StatTile
            label={t("avgCheck")}
            value={formatNumber(kpis.avgCheck.value)}
            unit={format.currency}
            delta={kpis.avgCheck.deltaPct}
            sparkline={sparklines.avgCheck}
          />
          <StatTile
            label={t("clinicVisits")}
            value={formatNumber(kpis.clinicVisits.value)}
            delta={kpis.clinicVisits.deltaPct}
            sparkline={sparklines.clinicVisits}
          />
          <StatTile
            label={t("newCustomers")}
            value={formatNumber(kpis.newCustomers.value)}
            delta={kpis.newCustomers.deltaPct}
            sparkline={sparklines.newCustomers}
          />
          <StatTile
            label={t("appActive")}
            value={formatNumber(kpis.appActiveUsers.value)}
            delta={kpis.appActiveUsers.deltaPct}
            sparkline={sparklines.appActiveUsers}
          />
        </StatRow>
      )}
    </QueryState>
  );
};
