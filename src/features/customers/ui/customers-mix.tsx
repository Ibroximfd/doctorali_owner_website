"use client";

import { useTranslations } from "next-intl";

import { seriesColor } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ChartCard } from "@/shared/ui/chart-card";
import { ChartSkeleton, QueryState } from "@/shared/ui/states";

import { useCustomersMixQuery } from "../hooks/use-customers";
import { MIX_SERIES_COLOR, isMixSeries } from "../model/customers.rules";

/** Davrda xarid qilganlar: yangi va qaytgan mijozlar (ustma-ust ustunlar). */
export const CustomersMix = ({ className }: { className?: string }) => {
  const t = useTranslations("customers.mix");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const query = useCustomersMixQuery();

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
      showTotal
      data={{
        labels: data.labels.map((label) => format.bucket(label, period.granularity)),
        series: data.series.map((series, index) => ({
          key: series.key,
          name: isMixSeries(series.key) ? t(series.key) : series.key,
          color: seriesColor(isMixSeries(series.key) ? MIX_SERIES_COLOR[series.key] : index),
          values: series.values,
        })),
      }}
    />
  );
};
