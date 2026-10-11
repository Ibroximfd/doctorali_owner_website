"use client";

import { useTranslations } from "next-intl";

import { STATUS_COLORS } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ChartCard } from "@/shared/ui/chart-card";
import { ChartSkeleton, QueryState } from "@/shared/ui/states";

import { useDeliveryTimeseriesQuery } from "../hooks/use-logistics";
import { dailySeries } from "../model/logistics.rules";

/** Kunlik yakun: yetkazilgan va atkaz bo'lgan buyurtmalar — holat ranglarida, ustma-ust. */
export const DailyDeliveriesChart = ({ className }: { className?: string }) => {
  const t = useTranslations("logistics.daily");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const query = useDeliveryTimeseriesQuery();

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
      kind="columns"
      title={t("title")}
      description={t("description")}
      columnLabel={tCommon("period")}
      formatValue={formatNumber}
      data={{
        labels: data.labels.map((label) => format.bucket(label, period.granularity)),
        series: dailySeries(data).map((series) => ({
          key: series.key,
          name: t(`series.${series.key}`),
          color: STATUS_COLORS[series.key],
          values: series.values,
        })),
      }}
    />
  );
};
