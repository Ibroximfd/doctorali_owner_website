"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatDecimal, formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Pill } from "@/shared/ui/pill";
import { QueryState, StateBlock, TableSkeleton } from "@/shared/ui/states";
import { PackageCheck } from "lucide-react";

import { useStockoutsQuery } from "../hooks/use-forecast";
import type { Stockout } from "../model/forecast.schema";

/** Ufq ichida tugaydigan mahsulotlar va qancha buyurtma qilish kerak. */
export const StockoutsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("forecast.stockouts");
  const format = useFormat();
  const query = useStockoutsQuery();

  const columns: Column<Stockout>[] = [
    {
      id: "product",
      header: t("columns.product"),
      primary: true,
      cell: (row) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{row.name}</div>
          <div className="text-2xs text-ink-3">{row.warehouseName}</div>
        </div>
      ),
    },
    {
      id: "date",
      header: t("columns.date"),
      align: "right",
      cell: (row) => (
        <Pill intent={row.severity === "critical" ? "crit" : row.severity === "high" ? "serious" : "warn"}>
          {format.date(row.stockoutDate)} · {t("days", { value: formatDecimal(row.daysLeft) })}
        </Pill>
      ),
    },
    {
      id: "qty",
      header: t("columns.qty"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.qty),
    },
    {
      id: "out",
      header: t("columns.out"),
      align: "right",
      numeric: true,
      cell: (row) => formatDecimal(row.avgDailyOut),
    },
    {
      id: "reorder",
      header: t("columns.reorder"),
      align: "right",
      cell: (row) => (
        <span className="num text-accent text-xs font-semibold">+{formatNumber(row.reorderQty)}</span>
      ),
    },
  ];

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={5} />}
          isEmpty={({ data }) => data.length === 0}
          empty={
            <StateBlock icon={PackageCheck} title={t("emptyTitle")} description={t("emptyDescription")} />
          }
        >
          {({ data }) => (
            <DataTable
              columns={columns}
              rows={data}
              rowKey={(row) => `${row.productId}-${row.warehouseName}`}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
