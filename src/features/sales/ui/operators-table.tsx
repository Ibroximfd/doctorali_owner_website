"use client";

import { Clock, PhoneMissed } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { MiniBar } from "@/shared/ui/mini-bar";
import { Pill } from "@/shared/ui/pill";
import { Rating } from "@/shared/ui/rating";
import { QueryState, TableSkeleton } from "@/shared/ui/states";
import { UserCell } from "@/shared/ui/user-cell";

import { useOperatorDrawer } from "../hooks/use-operator-drawer";
import { useOperatorsQuery } from "../hooks/use-sales";
import {
  MISSED_CALLS_SERIOUS,
  OVERDUE_ACTIVITIES_WARN,
  rankOperators,
  shareOfMax,
} from "../model/sales.rules";
import type { Operator } from "../model/sales.schema";

const DASH = "—";

/** Operatorlar reytingi (tanlangan filiallar). Qator bosilsa operator kartasi ochiladi. */
export const OperatorsTable = ({ className }: { className?: string }) => {
  const t = useTranslations("sales");
  const format = useFormat();
  const query = useOperatorsQuery();
  const { openOperator } = useOperatorDrawer();

  const ranked = rankOperators(query.data?.data ?? []);
  const maxSales = ranked[0]?.salesAmount ?? 0;

  const columns: Column<Operator>[] = [
    {
      id: "operator",
      header: t("operators.columns.operator"),
      primary: true,
      cell: (row, index) => (
        <UserCell
          rank={index + 1}
          name={row.fullName}
          // holat matn bilan ham yoziladi — nuqta rangi yolg'iz signal bo'lmasin
          subtitle={[row.filial, t(row.isOnline ? "status.online" : "status.offline")]
            .filter(Boolean)
            .join(" · ")}
          online={row.isOnline}
        />
      ),
    },
    {
      id: "sales",
      header: t("operators.columns.sales"),
      align: "right",
      cell: (row) => (
        <>
          <span className="num text-xs">{format.moneyCompact(row.salesAmount)}</span>
          <MiniBar percent={shareOfMax(row.salesAmount, maxSales)} />
        </>
      ),
    },
    {
      id: "leads",
      header: t("operators.columns.leads"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.leads),
    },
    {
      id: "conversion",
      header: t("operators.columns.conversion"),
      align: "right",
      numeric: true,
      cell: (row) => formatPercent(row.conversionPct),
    },
    {
      id: "delivered",
      header: t("operators.columns.delivered"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.ordersDelivered),
    },
    {
      id: "commission",
      header: t("operators.columns.commission"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.commissionEarned),
    },
    {
      id: "missed",
      header: t("operators.columns.missed"),
      align: "right",
      cell: (row) =>
        row.missedUnhandled >= MISSED_CALLS_SERIOUS ? (
          <Pill intent="serious" icon={PhoneMissed}>
            {formatNumber(row.missedUnhandled)}
          </Pill>
        ) : (
          <span className="num text-xs">{formatNumber(row.missedUnhandled)}</span>
        ),
    },
    {
      id: "overdue",
      header: t("operators.columns.overdue"),
      align: "right",
      cell: (row) =>
        row.activitiesOverdue >= OVERDUE_ACTIVITIES_WARN ? (
          <Pill intent="warn" icon={Clock}>
            {formatNumber(row.activitiesOverdue)}
          </Pill>
        ) : (
          <span className="num text-xs">{formatNumber(row.activitiesOverdue)}</span>
        ),
    },
    {
      id: "rating",
      header: t("operators.columns.rating"),
      align: "right",
      cell: (row) =>
        row.ratingAvg === null ? (
          <span className="text-ink-3">{DASH}</span>
        ) : (
          <Rating value={row.ratingAvg} />
        ),
    },
  ];

  return (
    <Card className={className}>
      <CardHeader title={t("operators.title")} description={t("operators.description")} />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={8} />}
          isEmpty={({ data }) => data.length === 0}
        >
          {() => (
            <DataTable
              columns={columns}
              rows={ranked}
              rowKey={(row) => String(row.id)}
              onRowClick={(row) => openOperator(row.id)}
              rowLabel={(row) => t("operators.rowLabel", { name: row.fullName })}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
