"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { QueryState, StatRowSkeleton } from "@/shared/ui/states";

import { useDoctorsSummaryQuery } from "../hooks/use-doctors";

/** Oxirgi katak (to'lanmagan komissiya) — hozirgi holat, shuning uchun taqqoslashsiz. */
export const DoctorsKpis = () => {
  const t = useTranslations("doctors.kpi");
  const format = useFormat();
  const query = useDoctorsSummaryQuery();

  return (
    <QueryState query={query} skeleton={<StatRowSkeleton count={4} />}>
      {({ data: summary }) => (
        <StatRow columns={4}>
          <StatTile
            label={t("active")}
            value={formatNumber(summary.activeDoctors.value)}
            delta={summary.activeDoctors.deltaPct}
            note={t("activeNote")}
          />
          <StatTile
            label={t("online")}
            value={formatNumber(summary.onlineConsultations.value)}
            delta={summary.onlineConsultations.deltaPct}
            sparkline={summary.sparklines.onlineConsultations}
          />
          <StatTile
            label={t("sales")}
            value={format.moneyCompact(summary.salesAmount.value)}
            unit={format.currency}
            delta={summary.salesAmount.deltaPct}
            sparkline={summary.sparklines.salesAmount}
          />
          <StatTile
            label={t("outstanding")}
            value={format.moneyCompact(summary.payoutOutstanding)}
            unit={format.currency}
            note={t("outstandingNote", { count: summary.doctorsWaiting })}
          />
        </StatRow>
      )}
    </QueryState>
  );
};
