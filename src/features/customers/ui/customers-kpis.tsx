"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatDecimal, formatNumber, formatPercent } from "@/shared/lib/format";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { QueryState, StatRowSkeleton } from "@/shared/ui/states";
import { pointChange } from "@/shared/lib/envelope";

import { useCustomersSummaryQuery } from "../hooks/use-customers";

export const CustomersKpis = () => {
  const t = useTranslations("customers.kpi");
  const format = useFormat();
  const query = useCustomersSummaryQuery();

  return (
    <QueryState query={query} skeleton={<StatRowSkeleton />}>
      {({ data: { sparklines, ...kpi } }) => (
        <StatRow>
          <StatTile
            label={t("total")}
            value={formatNumber(kpi.total.value)}
            delta={kpi.total.deltaPct}
            sparkline={sparklines.total}
          />
          <StatTile
            label={t("new")}
            value={formatNumber(kpi.new.value)}
            delta={kpi.new.deltaPct}
            sparkline={sparklines.new}
          />
          <StatTile
            label={t("returningRate")}
            value={formatPercent(kpi.returningRate.value)}
            delta={pointChange(kpi.returningRate)}
            deltaUnit="pp"
            sparkline={sparklines.returningRate}
          />
          <StatTile
            label={t("repeatRate")}
            value={formatPercent(kpi.repeatPurchaseRate.value)}
            delta={pointChange(kpi.repeatPurchaseRate)}
            deltaUnit="pp"
            note={t("repeatRateNote")}
            sparkline={sparklines.repeatPurchaseRate}
          />
          <StatTile
            label={t("avgLtv")}
            value={formatNumber(kpi.avgLtv.value)}
            unit={format.currency}
            delta={kpi.avgLtv.deltaPct}
            sparkline={sparklines.avgLtv}
          />
          <StatTile
            label={t("ordersPerCustomer")}
            value={formatDecimal(kpi.avgOrdersPerCustomer.value)}
            delta={kpi.avgOrdersPerCustomer.deltaPct}
            sparkline={sparklines.avgOrdersPerCustomer}
          />
        </StatRow>
      )}
    </QueryState>
  );
};
