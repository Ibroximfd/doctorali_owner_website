"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ChartCard } from "@/shared/ui/chart-card";
import { ChartSkeleton, QueryState } from "@/shared/ui/states";

import { useOrdersTrendQuery } from "../hooks/use-orders";
import { trendSeries } from "../model/orders.rules";

/** Yaratildi / yetkazildi / atkaz — soni bo'yicha. Yetkazildi va atkaz holat ranglarida. */
export const OrdersTrend = ({ className }: { className?: string }) => {
  const t = useTranslations("orders.trend");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const query = useOrdersTrendQuery();

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
        series: trendSeries(data.series).map((series) => ({
          key: series.key,
          name: t(`series.${series.key}`),
          color: series.color,
          values: series.values,
        })),
      }}
    />
  );
};
