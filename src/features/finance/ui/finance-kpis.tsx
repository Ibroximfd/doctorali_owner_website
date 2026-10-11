"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatPercent } from "@/shared/lib/format";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { QueryState, StatRowSkeleton } from "@/shared/ui/states";
import { metricAmount } from "@/shared/lib/envelope";

import { useFinanceSummaryQuery } from "../hooks/use-finance";
import { sharePct } from "../model/finance.rules";

/** To'rtta asosiy raqam: tushum, yig'ilgan pul, xarajat va (taxminiy) sof qoldiq. */
export const FinanceKpis = () => {
  const t = useTranslations("finance.kpi");
  const format = useFormat();
  const query = useFinanceSummaryQuery();

  return (
    <QueryState query={query} skeleton={<StatRowSkeleton count={4} />}>
      {({ data: { revenue, collected, expenses, netCash, sparklines } }) => (
        <StatRow columns={4}>
          <StatTile
            label={t("revenue")}
            value={format.moneyCompact(revenue.value)}
            unit={format.currency}
            delta={revenue.deltaPct}
            note={t("revenueNote")}
            sparkline={sparklines.revenue}
          />
          <StatTile
            label={t("collected")}
            value={format.moneyCompact(collected.value)}
            unit={format.currency}
            delta={collected.deltaPct}
            note={t("collectedNote")}
            sparkline={sparklines.collected}
          />
          <StatTile
            label={t("expenses")}
            value={format.moneyCompact(expenses.value)}
            unit={format.currency}
            delta={expenses.deltaPct}
            invertDelta
            note={t("expensesNote", {
              share: formatPercent(sharePct(metricAmount(expenses), metricAmount(collected))),
            })}
            sparkline={sparklines.expenses}
          />
          <StatTile
            label={t("netCash")}
            value={format.moneyCompact(netCash.value)}
            unit={format.currency}
            delta={netCash.deltaPct}
            note={t("netCashNote")}
            sparkline={sparklines.netCash}
          />
        </StatRow>
      )}
    </QueryState>
  );
};
