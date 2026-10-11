"use client";

import { useTranslations } from "next-intl";

import { formatNumber, formatPercent } from "@/shared/lib/format";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { QueryState, StatRowSkeleton } from "@/shared/ui/states";
import { pointChange } from "@/shared/lib/envelope";

import { useAppSummaryQuery } from "../hooks/use-mobile-app";

/** Ilovaning olti asosiy raqami: baza, o'sish, faollik, buyurtmadagi ulush, konsultatsiya, push. */
export const AppKpis = () => {
  const t = useTranslations("mobileApp.kpi");
  const query = useAppSummaryQuery();

  return (
    <QueryState query={query} skeleton={<StatRowSkeleton />}>
      {({ data: summary }) => (
        <StatRow>
          <StatTile
            label={t("usersTotal")}
            value={formatNumber(summary.usersTotal.value)}
            delta={summary.usersTotal.deltaPct}
            sparkline={summary.sparklines.usersTotal}
          />
          <StatTile
            label={t("newUsers")}
            value={formatNumber(summary.newUsers.value)}
            delta={summary.newUsers.deltaPct}
            sparkline={summary.sparklines.newUsers}
          />
          <StatTile
            label={t("activeUsers")}
            value={formatNumber(summary.activeUsers.value)}
            delta={summary.activeUsers.deltaPct}
            note={
              summary.avgDailyActiveUsers === null
                ? undefined
                : t("dailyAverage", { value: formatNumber(summary.avgDailyActiveUsers) })
            }
            sparkline={summary.sparklines.activeUsers}
          />
          <StatTile
            label={t("orderShare")}
            value={formatPercent(summary.appOrderShare.value)}
            delta={pointChange(summary.appOrderShare)}
            deltaUnit="pp"
            sparkline={summary.sparklines.appOrderShare}
          />
          <StatTile
            label={t("consultations")}
            value={formatNumber(summary.consultations.value)}
            delta={summary.consultations.deltaPct}
            sparkline={summary.sparklines.consultations}
          />
          <StatTile
            label={t("pushEnabled")}
            value={formatPercent(summary.pushEnabledRate.value, 0)}
            delta={pointChange(summary.pushEnabledRate)}
            deltaUnit="pp"
            sparkline={summary.sparklines.pushEnabledRate}
          />
        </StatRow>
      )}
    </QueryState>
  );
};
