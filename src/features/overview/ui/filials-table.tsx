"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { usePeriodLabel } from "@/shared/hooks/use-period-label";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { MetricDelta } from "@/shared/ui/metric-delta";
import { QueryState, TableSkeleton } from "@/shared/ui/states";

import { useOverviewQuery } from "../hooks/use-overview";
import type { Overview } from "../model/overview.schema";

type FilialRow = Overview["filials"][number];

const DASH = "—";

export const FilialsTable = ({ className }: { className?: string }) => {
  const t = useTranslations("overview.filials");
  const format = useFormat();
  const periodLabel = usePeriodLabel();
  const query = useOverviewQuery();
  const totals = query.data?.data;

  const sum = (pick: (row: FilialRow) => number | null): number =>
    (totals?.filials ?? []).reduce((total, row) => total + (pick(row) ?? 0), 0);

  const columns: Column<FilialRow>[] = [
    {
      id: "name",
      header: t("columns.name"),
      primary: true,
      cell: (row) => <span className="font-semibold">{row.name}</span>,
      footer: t("total"),
    },
    {
      id: "revenue",
      header: t("columns.revenue"),
      align: "right",
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="num text-xs">{format.moneyCompact(row.revenue.value)}</span>
          <MetricDelta value={row.revenue.deltaPct} />
        </span>
      ),
      footer: <span className="num text-xs">{format.moneyCompact(sum((row) => row.revenue.value))}</span>,
    },
    {
      id: "orders",
      header: t("columns.orders"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.orders),
      footer: formatNumber(sum((row) => row.orders)),
    },
    {
      id: "rate",
      header: t("columns.deliveryRate"),
      align: "right",
      numeric: true,
      cell: (row) => formatPercent(row.deliveryRate),
      footer: totals ? formatPercent(totals.kpis.deliveryRate.value) : DASH,
    },
    {
      id: "clinic",
      header: t("columns.clinic"),
      align: "right",
      numeric: true,
      cell: (row) =>
        row.clinicRevenue === null ? (
          <span className="text-ink-3">{DASH}</span>
        ) : (
          format.moneyCompact(row.clinicRevenue)
        ),
      footer: format.moneyCompact(sum((row) => row.clinicRevenue)),
    },
    {
      id: "debt",
      header: t("columns.openDebt"),
      align: "right",
      numeric: true,
      cell: (row) =>
        row.openDebt === null ? (
          <span className="text-ink-3">{DASH}</span>
        ) : (
          format.moneyCompact(row.openDebt)
        ),
      footer: format.moneyCompact(sum((row) => row.openDebt)),
    },
    {
      id: "cod",
      header: t("columns.courierCod"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.courierCod),
      footer: format.moneyCompact(sum((row) => row.courierCod)),
    },
  ];

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={periodLabel} />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={3} />}
          isEmpty={({ data }) => data.filials.length === 0}
        >
          {({ data }) => <DataTable columns={columns} rows={data.filials} rowKey={(row) => String(row.id)} />}
        </QueryState>
      </CardBody>
    </Card>
  );
};
