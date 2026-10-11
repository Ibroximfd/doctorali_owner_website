"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { QueryState, StatRowSkeleton } from "@/shared/ui/states";
import { pointChange } from "@/shared/lib/envelope";

import { useOrdersSummaryQuery } from "../hooks/use-orders";

/** Olti asosiy raqam. Atkaz ulushi va yetkazish vaqti uchun o'sish — yomon (`invertDelta`). */
export const OrdersKpis = () => {
  const t = useTranslations("orders.kpi");
  const format = useFormat();
  const query = useOrdersSummaryQuery();

  return (
    <QueryState query={query} skeleton={<StatRowSkeleton />}>
      {({ data: { sparklines, ...kpi } }) => (
        <StatRow>
          <StatTile
            label={t("orders")}
            value={formatNumber(kpi.orders.value)}
            delta={kpi.orders.deltaPct}
            sparkline={sparklines.orders}
          />
          <StatTile
            label={t("confirmedRate")}
            value={formatPercent(kpi.confirmedRate.value)}
            delta={pointChange(kpi.confirmedRate)}
            deltaUnit="pp"
            sparkline={sparklines.confirmedRate}
          />
          <StatTile
            label={t("delivered")}
            value={formatNumber(kpi.delivered.value)}
            delta={kpi.delivered.deltaPct}
            sparkline={sparklines.delivered}
          />
          <StatTile
            label={t("cancelRate")}
            value={formatPercent(kpi.cancelRate.value)}
            delta={pointChange(kpi.cancelRate)}
            deltaUnit="pp"
            invertDelta
            sparkline={sparklines.cancelRate}
          />
          <StatTile
            label={t("avgCheck")}
            value={formatNumber(kpi.avgCheck.value)}
            unit={format.currency}
            delta={kpi.avgCheck.deltaPct}
            sparkline={sparklines.avgCheck}
          />
          <StatTile
            label={t("avgDelivery")}
            value={format.duration(kpi.avgDeliveryMinutes.value)}
            delta={kpi.avgDeliveryMinutes.deltaPct}
            invertDelta
            sparkline={sparklines.avgDeliveryMinutes}
          />
        </StatRow>
      )}
    </QueryState>
  );
};
