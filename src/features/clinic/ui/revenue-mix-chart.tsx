"use client";

import { useTranslations } from "next-intl";

import { seriesColor } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ChartCard } from "@/shared/ui/chart-card";
import { ChartSkeleton, QueryState } from "@/shared/ui/states";

import { useClinicRevenueMixQuery } from "../hooks/use-clinic";
import { REVENUE_MIX_KEYS, isRevenueMixKey } from "../model/clinic.rules";

/** Klinika tushumi nimadan yig'ildi: mahsulot sotuvi, muolaja va konsultatsiya (ustma-ust). */
export const RevenueMixChart = ({ className }: { className?: string }) => {
  const t = useTranslations("clinic.mix");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const query = useClinicRevenueMixQuery();

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
      formatValue={format.money}
      formatAxis={format.moneyCompact}
      showTotal
      data={{
        labels: data.labels.map((label) => format.bucket(label, period.granularity)),
        series: data.series.map((series, index) => ({
          key: series.key,
          name: isRevenueMixKey(series.key) ? t(`series.${series.key}`) : series.key,
          color: seriesColor(isRevenueMixKey(series.key) ? REVENUE_MIX_KEYS.indexOf(series.key) : index),
          values: series.values,
        })),
      }}
    />
  );
};
