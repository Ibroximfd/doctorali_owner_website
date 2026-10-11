"use client";

import { useTranslations } from "next-intl";

import { seriesColor } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { useMetaQuery } from "@/shared/meta/use-meta-query";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ChartCard } from "@/shared/ui/chart-card";
import { ChartSkeleton, QueryState } from "@/shared/ui/states";

import { useSalesFilialsTrendQuery } from "../hooks/use-sales";
import { filialColorIndex } from "../model/sales.rules";

/** Operatorlar sotuvi dinamikasi: har filial — alohida chiziq (rang filialga biriktirilgan). */
export const FilialsTrend = ({ className }: { className?: string }) => {
  const t = useTranslations("sales.filialTrend");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const query = useSalesFilialsTrendQuery();
  const filials = useMetaQuery().data?.filials ?? [];

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
  // Rang lug'atdagi filiallar tartibidan — ulush kartasi bilan bir xil, javobda filial yo'q bo'lsa ham siljimaydi.
  const ids = filials.length > 0 ? filials : data.series.map((series) => ({ id: Number(series.key) }));

  return (
    <ChartCard
      className={className}
      kind="trend"
      title={t("title")}
      description={t("description")}
      columnLabel={tCommon("period")}
      formatValue={format.money}
      formatAxis={format.moneyCompact}
      showTotal
      data={{
        labels: data.labels.map((label) => format.bucket(label, period.granularity)),
        series: data.series.map((series) => ({
          key: series.key,
          // nom lug'atdan; lug'at hali kelmagan bo'lsa — filial raqami
          name: filials.find((filial) => String(filial.id) === series.key)?.name ?? series.key,
          color: seriesColor(filialColorIndex(ids, Number(series.key))),
          values: series.values,
        })),
      }}
    />
  );
};
