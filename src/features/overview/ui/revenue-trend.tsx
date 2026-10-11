"use client";

import { useTranslations } from "next-intl";

import { CHANNEL_COLOR, seriesColor, type ChannelKey } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ChartCard } from "@/shared/ui/chart-card";
import { ChartSkeleton, QueryState } from "@/shared/ui/states";

import { useRevenueTrendQuery } from "../hooks/use-overview";

const isChannel = (key: string): key is ChannelKey => key in CHANNEL_COLOR;

export const RevenueTrend = ({ className }: { className?: string }) => {
  const t = useTranslations("overview");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const query = useRevenueTrendQuery();

  if (query.data === undefined) {
    return (
      <Card className={className}>
        <CardHeader title={t("trend.title")} description={t("trend.description")} />
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
      title={t("trend.title")}
      description={t("trend.description")}
      columnLabel={tCommon("period")}
      formatValue={format.money}
      formatAxis={format.moneyCompact}
      showTotal
      data={{
        labels: data.labels.map((label) => format.bucket(label, period.granularity)),
        series: data.series.map((series, index) => ({
          key: series.key,
          name: isChannel(series.key) ? t(`channels.${series.key}`) : series.key,
          color: seriesColor(isChannel(series.key) ? CHANNEL_COLOR[series.key] : index),
          values: series.values,
        })),
      }}
    />
  );
};
