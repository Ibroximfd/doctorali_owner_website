"use client";

import { useTranslations } from "next-intl";

import { seriesColor } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { usePeriodLabel } from "@/shared/hooks/use-period-label";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ChartCard } from "@/shared/ui/chart-card";
import { MiniStats } from "@/shared/ui/mini-stats";
import { BlockSkeleton, ChartSkeleton, QueryState } from "@/shared/ui/states";
import { metricAmount } from "@/shared/lib/envelope";

import { useCashflowQuery, useFlowHighlightsQuery } from "../hooks/use-finance";
import { useExpenseCategoryLabel } from "../hooks/use-finance-labels";
import { FLOW_COLOR, averageDailyInflow, biggestExpense, flowSeries } from "../model/finance.rules";

const DASH = "—";

/** Kirim (maydon bilan) va chiqim — bitta o'qda; ostida davr yakunidagi uchta ko'rsatkich. */
export const CashflowCard = ({ className }: { className?: string }) => {
  const t = useTranslations("finance.cashflow");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const query = useCashflowQuery();

  if (query.data === undefined) {
    return (
      <Card className={className}>
        <CardHeader title={t("title")} description={t("description")} />
        <CardBody>
          <QueryState query={query} skeleton={<ChartSkeleton />}>
            {() => null}
          </QueryState>
          {/* Ko'rsatkichlar grafikni kutmaydi: so'rovlari darhol boshlanadi, grafik xatosi ularni yashirmaydi. */}
          <div className="mt-3.5">
            <FlowHighlights />
          </div>
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
      formatValue={format.money}
      formatAxis={format.moneyCompact}
      footer={<FlowHighlights />}
      data={{
        labels: data.labels.map((label) => format.bucket(label, period.granularity)),
        series: flowSeries(data).map((series) => ({
          key: series.key,
          name: t(`series.${series.key}`),
          color: seriesColor(FLOW_COLOR[series.key]),
          values: series.values,
          area: series.key === "inflow",
        })),
      }}
    />
  );
};

const HighlightsSkeleton = () => (
  <div aria-busy="true" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
    {Array.from({ length: 3 }, (_, index) => (
      <BlockSkeleton key={index} className="h-16" />
    ))}
  </div>
);

/** Qaytarishlar, o'rtacha kunlik kirim va eng katta xarajat toifasi. */
const FlowHighlights = () => {
  const t = useTranslations("finance.cashflow");
  const format = useFormat();
  const periodLabel = usePeriodLabel();
  const categoryLabel = useExpenseCategoryLabel();
  const query = useFlowHighlightsQuery();

  return (
    <QueryState query={query} skeleton={<HighlightsSkeleton />}>
      {({ summary, period, returns, expenses }) => {
        const biggest = biggestExpense(expenses);

        return (
          <MiniStats
            items={[
              {
                key: "refunds",
                label: t("refunds"),
                value: format.moneyCompact(returns.refundAmount),
                unit: format.currency,
                note: t("refundsNote", { count: formatNumber(returns.count) }),
              },
              {
                key: "avgInflow",
                label: t("avgInflow"),
                value: format.moneyCompact(averageDailyInflow(metricAmount(summary.collected), period)),
                unit: format.currency,
                note: periodLabel.toLowerCase(),
              },
              {
                key: "biggestExpense",
                label: t("biggestExpense"),
                value: biggest ? categoryLabel(biggest.category) : DASH,
                note: biggest
                  ? t("biggestExpenseNote", {
                      share: formatPercent(biggest.sharePct),
                      value: format.money(biggest.amount),
                    })
                  : t("noExpenses"),
              },
            ]}
          />
        );
      }}
    </QueryState>
  );
};
