"use client";

import { useTranslations } from "next-intl";

import { seriesColor } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ChartCard } from "@/shared/ui/chart-card";
import { MiniStats } from "@/shared/ui/mini-stats";
import { ChartSkeleton, QueryState } from "@/shared/ui/states";

import { useSalesCallsQuery, useSalesSummaryQuery } from "../hooks/use-sales";
import { CALL_SERIES_COLOR, callTotals, isCallSeries, splitSeconds } from "../model/sales.rules";

/** Javob berilgan va o'tkazib yuborilgan qo'ng'iroqlar (ustma-ust) + yig'ma ko'rsatkichlar. */
export const CallsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("sales.calls");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const query = useSalesCallsQuery();
  // "Hal qilinmagan" soni yig'ma javobda; u kelmasa izohsiz ko'rsatiladi — blok yiqilmaydi.
  const unhandled = useSalesSummaryQuery().data?.data.callsMissedUnhandled.value;

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
  const totals = callTotals(data);

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
          name: isCallSeries(series.key) ? t(series.key) : series.key,
          color: isCallSeries(series.key) ? CALL_SERIES_COLOR[series.key] : seriesColor(index),
          values: series.values,
        })),
      }}
      footer={
        <MiniStats
          items={[
            { key: "answerRate", label: t("answerRate"), value: formatPercent(totals.answerRate) },
            {
              key: "avgDuration",
              label: t("avgDuration"),
              // Javob berilgan qo'ng'iroq bo'lmagan davrda o'rtacha yo'q.
              value: data.avgDurationSec === null ? "—" : t("duration", splitSeconds(data.avgDurationSec)),
            },
            {
              key: "missed",
              label: t("missedTotal"),
              value: formatNumber(totals.missed),
              note:
                unhandled === undefined ? undefined : t("unhandledNote", { count: formatNumber(unhandled) }),
            },
          ]}
        />
      }
    />
  );
};
