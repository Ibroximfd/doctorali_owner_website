"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { formatDecimal, formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Segmented } from "@/shared/ui/segmented";
import { NoResults, QueryState, TableSkeleton } from "@/shared/ui/states";

import { useStockQuery } from "../hooks/use-warehouse";
import { isProblemStock } from "../model/warehouse.rules";
import type { StockRow } from "../model/warehouse.schema";
import { StockStatusPill } from "./stock-status";

type Filter = "all" | "problems" | "low";

const matches = (row: StockRow, filter: Filter): boolean => {
  if (filter === "problems") return isProblemStock(row.status);
  if (filter === "low") return row.status === "low";
  return true;
};

/** Ustunlar: ombor ustuni faqat hamma omborlar ko'rinishida. */
export const useStockColumns = (withWarehouse: boolean): Column<StockRow>[] => {
  const t = useTranslations("warehouse.stock.columns");
  const format = useFormat();
  const columns: Column<StockRow>[] = [
    {
      id: "product",
      header: t("product"),
      primary: true,
      cell: (row) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{row.name}</div>
          <div className="text-2xs text-ink-3 num">
            {row.sku}
            {withWarehouse ? ` · ${row.warehouseName}` : ""}
          </div>
        </div>
      ),
    },
    {
      id: "qty",
      header: t("qty"),
      align: "right",
      numeric: true,
      cell: (row) => (
        <>
          {formatNumber(row.qty)}
          {row.minQty === null ? null : (
            <span className="text-ink-3 text-2xs"> / {formatNumber(row.minQty)}</span>
          )}
        </>
      ),
    },
    {
      id: "out",
      header: t("dailyOut"),
      align: "right",
      numeric: true,
      cell: (row) => formatDecimal(row.avgDailyOut),
    },
    {
      id: "cover",
      header: t("cover"),
      align: "right",
      numeric: true,
      cell: (row) => (row.daysOfCover === null ? "—" : formatDecimal(row.daysOfCover)),
    },
    {
      id: "stockout",
      header: t("stockout"),
      align: "right",
      cell: (row) => (row.stockoutDate ? format.date(row.stockoutDate) : "—"),
    },
    {
      id: "value",
      header: t("value"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.value),
    },
    { id: "status", header: t("status"), cell: (row) => <StockStatusPill status={row.status} /> },
  ];
  return columns;
};

/** Mahsulot qoldig'i: eng xavflisi tepada; filtr — muammoli / kam qolgan. */
export const StockTable = ({ className }: { className?: string }) => {
  const t = useTranslations("warehouse.stock");
  const [filter, setFilter] = useState<Filter>("all");
  const query = useStockQuery(null);
  const columns = useStockColumns(true);

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={t("description")}
        action={
          <Segmented
            ariaLabel={t("filter")}
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("filters.all") },
              { value: "problems", label: t("filters.problems") },
              { value: "low", label: t("filters.low") },
            ]}
          />
        }
      />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={8} />}
          isEmpty={({ data }) => data.length === 0}
        >
          {({ data }) => {
            const rows = data.filter((row) => matches(row, filter));
            if (rows.length === 0) return <NoResults onClear={() => setFilter("all")} />;
            return (
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => `${row.warehouseId}-${row.productId}`}
              />
            );
          }}
        </QueryState>
      </CardBody>
    </Card>
  );
};
