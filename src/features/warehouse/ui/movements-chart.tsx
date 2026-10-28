"use client";

import { useTranslations } from "next-intl";

import { seriesColor } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ChartCard } from "@/shared/ui/chart-card";
import { ChartSkeleton, QueryState } from "@/shared/ui/states";

import { useMovementsQuery } from "../hooks/use-warehouse";

/** Seriya → rang: kirim va chiqim har doim bir xil rangda. */
const MOVEMENT_COLOR: Record<string, string> = { inbound: seriesColor(0), outbound: seriesColor(2) };

/** Kunlik kirim va chiqim (dona). */
export const MovementsChart = ({ className }: { className?: string }) => {
  const t = useTranslations("warehouse.movements");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const query = useMovementsQuery();

  if (query.data === undefined) {
    return (
      <Card className={className}>
        <CardHeader title={t("title")} description={t("description")} />
        <CardBody>
          <QueryState query={query} skeleton={<ChartSkeleton />}>
            {() => null}
          </QueryState>
        </CardBody>
      </Card>
    );
  }

  const { period, data } = query.data;
  return (
    <ChartCard
      className={className}
      kind="trend"
      title={t("title")}
      description={t("description")}
      columnLabel={tCommon("period")}
      formatValue={formatNumber}
      data={{
        labels: data.labels.map((label) => format.bucket(label, period.granularity)),
        series: data.series.map((series, index) => ({
          key: series.key,
          name:
            series.key === "inbound" || series.key === "outbound" ? t(`series.${series.key}`) : series.key,
          color: MOVEMENT_COLOR[series.key] ?? seriesColor(index + 3),
          values: series.values,
        })),
      }}
    />
  );
};
