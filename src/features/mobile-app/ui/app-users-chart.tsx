"use client";

import { useTranslations } from "next-intl";

import { seriesColor } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ChartCard } from "@/shared/ui/chart-card";
import { ChartSkeleton, QueryState } from "@/shared/ui/states";

import { useAppTimeseriesQuery } from "../hooks/use-mobile-app";
import { seriesValues } from "../model/mobile-app.rules";
import type { AppTimeseriesMetric } from "../model/mobile-app.schema";

/** Har o'lchov o'z grafigida: faollar — chiziq (daraja), yangi foydalanuvchilar — ustun (davrdagi son). */
const CHARTS = {
  active_users: { kind: "trend", messages: "activeUsers", heightClassName: "h-56 md:h-80" },
  new_users: { kind: "columns", messages: "newUsers", heightClassName: "h-52 md:h-56" },
} as const satisfies Record<
  AppTimeseriesMetric,
  { kind: "trend" | "columns"; messages: string; heightClassName: string }
>;

type AppUsersChartProps = { metric: AppTimeseriesMetric; className?: string };

export const AppUsersChart = ({ metric, className }: AppUsersChartProps) => {
  const chart = CHARTS[metric];
  const t = useTranslations(`mobileApp.charts.${chart.messages}`);
  const tCommon = useTranslations("common");
  const format = useFormat();
  const query = useAppTimeseriesQuery(metric);

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
      kind={chart.kind}
      heightClassName={chart.heightClassName}
      title={t("title")}
      description={t("description")}
      columnLabel={tCommon("period")}
      formatValue={formatNumber}
      data={{
        labels: data.labels.map((label) => format.bucket(label, period.granularity)),
        series: [
          { key: metric, name: t("series"), color: seriesColor(0), values: seriesValues(data, metric) },
        ],
      }}
    />
  );
};
