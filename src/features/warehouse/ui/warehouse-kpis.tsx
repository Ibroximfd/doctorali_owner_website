"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatDecimal, formatNumber } from "@/shared/lib/format";
import { AnimatedNumber } from "@/shared/ui/motion/animated-number";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { QueryState, StatRowSkeleton } from "@/shared/ui/states";

import { useWarehouseSummaryQuery } from "../hooks/use-warehouse";

/** Qoldiq (hozir) va davrdagi kirim/chiqim. */
export const WarehouseKpis = () => {
  const t = useTranslations("warehouse.kpi");
  const format = useFormat();
  const query = useWarehouseSummaryQuery();

  return (
    <QueryState query={query} skeleton={<StatRowSkeleton />}>
      {({ data, generatedAt }) => (
        <StatRow>
          <StatTile
            label={t("units")}
            value={<AnimatedNumber value={data.stockUnits} format={formatNumber} />}
            note={t("skus", { count: data.skuCount })}
          />
          <StatTile
            label={t("value")}
            value={<AnimatedNumber value={data.stockValue} format={format.moneyCompact} />}
            unit={format.currency}
            note={
              data.snapshotAt
                ? t("snapshot", { time: format.dateTime(data.snapshotAt) })
                : t("live", { time: format.time(generatedAt) })
            }
          />
          <StatTile
            label={t("inbound")}
            value={formatNumber(data.inbound.value)}
            delta={data.inbound.deltaPct}
          />
          <StatTile
            label={t("outbound")}
            value={formatNumber(data.outbound.value)}
            delta={data.outbound.deltaPct}
          />
          <StatTile
            label={t("cover")}
            value={data.daysOfCover === null ? "—" : formatDecimal(data.daysOfCover)}
            unit={data.daysOfCover === null ? undefined : t("daysUnit")}
          />
          <StatTile
            label={t("problems")}
            value={formatNumber(data.outSkus + data.lowSkus)}
            note={t("problemsNote", { out: data.outSkus, low: data.lowSkus })}
          />
        </StatRow>
      )}
    </QueryState>
  );
};
