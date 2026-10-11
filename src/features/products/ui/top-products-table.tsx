"use client";

import { OctagonAlert, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { MiniBar } from "@/shared/ui/mini-bar";
import { Pill } from "@/shared/ui/pill";
import { QueryState, TableSkeleton } from "@/shared/ui/states";

import { useProductsQuery } from "../hooks/use-products";
import { rankProducts, shareOfMax, stockLevel } from "../model/products.rules";
import type { Product } from "../model/products.schema";

const DASH = "—";

/** Tushum bo'yicha top mahsulotlar: kanallar bo'yicha dona va ombor qoldig'i. */
export const TopProductsTable = ({ className }: { className?: string }) => {
  const t = useTranslations("products.top");
  const format = useFormat();
  const query = useProductsQuery();

  const ranked = rankProducts(query.data?.data.results ?? []);
  const maxRevenue = ranked[0]?.revenue ?? 0;

  const stockCell = (row: Product) => {
    const level = stockLevel(row);
    if (level === "untracked" || row.stockQuantity === null)
      return <span className="text-ink-3">{DASH}</span>;
    if (level === "out") {
      return (
        <Pill intent="crit" icon={OctagonAlert}>
          {t("out")}
        </Pill>
      );
    }
    if (level === "low") {
      return (
        <Pill intent="warn" icon={TriangleAlert}>
          {t("low", { count: formatNumber(row.stockQuantity) })}
        </Pill>
      );
    }
    return <span className="num text-xs">{formatNumber(row.stockQuantity)}</span>;
  };

  const columns: Column<Product>[] = [
    {
      id: "product",
      header: t("columns.product"),
      primary: true,
      cell: (row, index) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="num text-ink-3 w-4.5 shrink-0 text-xs font-semibold">{index + 1}</span>
          <div className="min-w-0 leading-tight">
            <div className="truncate font-semibold">{row.name}</div>
            {row.category ? <div className="text-2xs text-ink-3 truncate">{row.category}</div> : null}
          </div>
        </div>
      ),
    },
    {
      id: "revenue",
      header: t("columns.revenue"),
      align: "right",
      cell: (row) => (
        <>
          <span className="num text-xs">{format.moneyCompact(row.revenue)}</span>
          <MiniBar percent={shareOfMax(row.revenue, maxRevenue)} />
        </>
      ),
    },
    {
      id: "units",
      header: t("columns.units"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.units),
    },
    {
      id: "delivery",
      header: t("columns.delivery"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.deliveryUnits),
    },
    {
      id: "clinic",
      header: t("columns.clinic"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.clinicUnits),
    },
    {
      id: "gift",
      header: t("columns.gift"),
      align: "right",
      numeric: true,
      cell: (row) =>
        row.giftUnits > 0 ? formatNumber(row.giftUnits) : <span className="text-ink-3">{DASH}</span>,
    },
    { id: "stock", header: t("columns.stock"), align: "right", cell: stockCell },
  ];

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={8} />}
          isEmpty={({ data }) => data.results.length === 0}
        >
          {() => <DataTable columns={columns} rows={ranked} rowKey={(row) => String(row.id)} />}
        </QueryState>
      </CardBody>
    </Card>
  );
};
