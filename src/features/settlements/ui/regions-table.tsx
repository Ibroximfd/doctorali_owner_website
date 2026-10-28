"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { useRegionName } from "@/shared/meta/use-region-name";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { QueryState, TableSkeleton } from "@/shared/ui/states";

import { useRegionSettlementsQuery } from "../hooks/use-settlements";
import { byDebtDesc, paidPercent } from "../model/settlements.rules";
import type { RegionSettlement } from "../model/settlements.schema";
import { SettlementStatusPill } from "./settlement-status";

/** To'langan ulush chizig'i: qarz qolgan bo'lsa — ogohlantirish rangida. */
const PaidBar = ({ row }: { row: RegionSettlement }) => {
  const reduce = useReducedMotion();
  const percent = paidPercent(row.paid, row.netDue);
  return (
    <div className="bg-surface-3 mt-1 h-1 w-full min-w-16 overflow-hidden rounded-full">
      {/* kenglik — hisoblangan foiz */}
      <motion.div
        className={cn("h-full rounded-full", row.debt > 0 ? "bg-warn" : "bg-good")}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      />
    </div>
  );
};

/** Hududlar: sotuv − xarajat − kuryer haqi = kutilgan; to'langan va qarz. Qarzdor tepada. */
export const RegionsTable = ({ className }: { className?: string }) => {
  const t = useTranslations("settlements.regions");
  const format = useFormat();
  const regionName = useRegionName();
  const query = useRegionSettlementsQuery();

  const columns: Column<RegionSettlement>[] = [
    {
      id: "region",
      header: t("columns.region"),
      primary: true,
      cell: (row) => (
        <div className="min-w-0">
          <div className={cn("text-sm font-medium", row.debt > 0 && "text-crit")}>
            {regionName(row.region)}
          </div>
          <div className="text-2xs text-ink-3">{t("orders", { count: row.orders })}</div>
        </div>
      ),
    },
    {
      id: "sales",
      header: t("columns.sales"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.sales),
    },
    {
      id: "costs",
      header: t("columns.costs"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.expenses + row.courierFees),
    },
    {
      id: "net",
      header: t("columns.net"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.netDue),
    },
    {
      id: "paid",
      header: t("columns.paid"),
      align: "right",
      cell: (row) => (
        <div className="num text-xs">
          {format.moneyCompact(row.paid)}
          <PaidBar row={row} />
        </div>
      ),
    },
    {
      id: "debt",
      header: t("columns.debt"),
      align: "right",
      cell: (row) =>
        row.debt > 0 ? (
          <span className="num text-crit text-xs font-semibold">{format.moneyCompact(row.debt)}</span>
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
    {
      id: "overdue",
      header: t("columns.overdue"),
      align: "right",
      numeric: true,
      cell: (row) => (row.daysOverdue === null ? "—" : t("days", { count: row.daysOverdue })),
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: (row) => <SettlementStatusPill status={row.status} />,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={8} />}
          isEmpty={({ data }) => data.length === 0}
        >
          {({ data }) => {
            const rows = byDebtDesc(data);
            const total = (pick: (row: RegionSettlement) => number) =>
              format.moneyCompact(rows.reduce((sum, row) => sum + pick(row), 0));
            return (
              <DataTable
                columns={columns.map((column) => {
                  if (column.id === "region")
                    return { ...column, footer: t("total", { count: formatNumber(rows.length) }) };
                  if (column.id === "sales") return { ...column, footer: total((row) => row.sales) };
                  if (column.id === "net") return { ...column, footer: total((row) => row.netDue) };
                  if (column.id === "debt") return { ...column, footer: total((row) => row.debt) };
                  return column;
                })}
                rows={rows}
                rowKey={(row) => row.region}
              />
            );
          }}
        </QueryState>
      </CardBody>
    </Card>
  );
};
