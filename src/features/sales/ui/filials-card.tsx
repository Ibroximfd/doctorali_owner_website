"use client";

import { Clock, PhoneMissed, TrendingDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { useFilialFocus } from "@/shared/hooks/use-scope";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Meter } from "@/shared/ui/meter";
import { MetricDelta } from "@/shared/ui/metric-delta";
import { Pill } from "@/shared/ui/pill";
import { Rating } from "@/shared/ui/rating";
import { QueryState, TableSkeleton } from "@/shared/ui/states";

import { useSalesFilialsQuery } from "../hooks/use-sales";
import {
  FILIAL_MISSED_CALLS_SERIOUS,
  FILIAL_OVERDUE_ACTIVITIES_WARN,
  companySalesPerOperator,
  gapDirection,
  isLaggingFilial,
  perOperatorGapPct,
  rankFilials,
} from "../model/sales.rules";
import type { SalesFilial } from "../model/sales.schema";

const DASH = "—";

/**
 * Operator jamoalari filial kesimida: har filial — bitta qator. Ro'yxat har doim
 * to'liq; qator bosilsa butun panel shu filialga torayadi, yana bosilsa — qaytadi.
 */
export const FilialsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("sales.filials");
  const format = useFormat();
  const query = useSalesFilialsQuery();
  const focus = useFilialFocus();

  const ranked = rankFilials(query.data?.data ?? []);
  const companyAverage = companySalesPerOperator(ranked);

  const columns: Column<SalesFilial>[] = [
    {
      id: "filial",
      header: t("columns.filial"),
      primary: true,
      cell: (row) => (
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{row.name}</span>
            {focus.isFocused(row.id) ? <Pill intent="good">{t("selected")}</Pill> : null}
          </div>
          {row.adminName ? (
            <div className="text-2xs text-ink-3">{t("admin", { name: row.adminName })}</div>
          ) : null}
          <div className="text-2xs text-ink-3">
            {t("team", { total: row.operatorsTotal, online: row.operatorsOnline })}
          </div>
        </div>
      ),
    },
    {
      id: "sales",
      header: t("columns.sales"),
      align: "right",
      cell: (row) => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="num text-xs">{format.moneyCompact(row.salesAmount.value)}</span>
          <MetricDelta value={row.salesAmount.deltaPct} />
        </div>
      ),
    },
    {
      id: "perOperator",
      header: t("columns.perOperator"),
      align: "right",
      cell: (row) => {
        const gap = perOperatorGapPct(row.salesPerOperator, companyAverage);
        const note = t(`gap.${gapDirection(gap)}`, { pct: formatPercent(Math.abs(gap), 0) });
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span className="num text-xs">{format.moneyCompact(row.salesPerOperator)}</span>
            {isLaggingFilial(gap) ? (
              <Pill intent="warn" icon={TrendingDown}>
                {note}
              </Pill>
            ) : (
              <span className="text-2xs text-ink-3 whitespace-nowrap">{note}</span>
            )}
          </div>
        );
      },
    },
    {
      id: "leads",
      header: t("columns.leads"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.leads),
    },
    {
      id: "conversion",
      header: t("columns.conversion"),
      align: "right",
      numeric: true,
      cell: (row) => formatPercent(row.conversionPct),
    },
    {
      id: "delivered",
      header: t("columns.delivered"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.ordersDelivered),
    },
    {
      id: "missed",
      header: t("columns.missed"),
      align: "right",
      cell: (row) =>
        row.missedUnhandled >= FILIAL_MISSED_CALLS_SERIOUS ? (
          <Pill intent="serious" icon={PhoneMissed}>
            {formatNumber(row.missedUnhandled)}
          </Pill>
        ) : (
          <span className="num text-xs">{formatNumber(row.missedUnhandled)}</span>
        ),
    },
    {
      id: "overdue",
      header: t("columns.overdue"),
      align: "right",
      cell: (row) =>
        row.activitiesOverdue >= FILIAL_OVERDUE_ACTIVITIES_WARN ? (
          <Pill intent="warn" icon={Clock}>
            {formatNumber(row.activitiesOverdue)}
          </Pill>
        ) : (
          <span className="num text-xs">{formatNumber(row.activitiesOverdue)}</span>
        ),
    },
    {
      id: "rating",
      header: t("columns.rating"),
      align: "right",
      cell: (row) =>
        row.ratingAvg === null ? (
          <span className="text-ink-3">{DASH}</span>
        ) : (
          <Rating value={row.ratingAvg} />
        ),
    },
    {
      id: "plan",
      header: t("columns.plan"),
      align: "right",
      cell: (row) =>
        row.plan === null ? (
          <span className="text-ink-3 text-xs">{t("noPlan")}</span>
        ) : (
          <div className="ml-auto flex w-24 flex-col gap-1">
            <span className="num text-xs">{formatPercent(row.plan.pct)}</span>
            <Meter
              value={row.plan.pct}
              ariaLabel={t("planLabel", { name: row.name, pct: formatPercent(row.plan.pct) })}
              // tanlangan qator foni yo'lakcha rangi bilan bir xil — yo'lakcha ko'rinib tursin
              className={focus.isFocused(row.id) ? "bg-surface" : undefined}
            />
          </div>
        ),
    },
  ];

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={t("description")}
        action={
          focus.hasFocus ? (
            <Button size="sm" onClick={focus.clear}>
              {t("showAll")}
            </Button>
          ) : undefined
        }
      />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={3} />}
          isEmpty={({ data }) => data.length === 0}
        >
          {() => (
            <DataTable
              columns={columns}
              rows={ranked}
              rowKey={(row) => String(row.id)}
              onRowClick={(row) => focus.toggle(row.id)}
              isRowSelected={(row) => focus.isFocused(row.id)}
              rowLabel={(row) =>
                t(focus.isFocused(row.id) ? "rowLabelSelected" : "rowLabel", { name: row.name })
              }
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
