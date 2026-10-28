"use client";

import { Tag } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { BlockSkeleton, QueryState } from "@/shared/ui/states";

import { useSalesMixQuery } from "../hooks/use-warehouse";
import type { SalesMix } from "../model/warehouse.schema";
import { SalesMixFlow } from "./sales-mix-flow";
import { MixSummary } from "./sales-mix-summary";

type MixProduct = SalesMix["products"][number];

/**
 * Chiqim tarkibi: davrda ombordan chiqqan mahsulot qancha to'liq narxda, qancha chegirmada sotildi
 * va qanchasi sovg'a berildi — oqim diagrammasi (jami → tur → sabab), xulosa va har mahsulot.
 */
export const SalesMixCard = ({ className }: { className?: string }) => {
  const t = useTranslations("warehouse.mix");
  const format = useFormat();
  const query = useSalesMixQuery();

  const columns: Column<MixProduct>[] = [
    {
      id: "name",
      header: t("columns.product"),
      primary: true,
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: "full",
      header: t("columns.full"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.fullUnits),
    },
    {
      id: "discount",
      header: t("columns.discount"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.discountUnits),
    },
    {
      id: "gift",
      header: t("columns.gift"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.giftUnits),
    },
    {
      id: "avgDiscount",
      header: t("columns.avgDiscount"),
      align: "right",
      numeric: true,
      cell: (row) => formatPercent(row.avgDiscountPct),
    },
    {
      id: "lost",
      header: t("columns.lost"),
      align: "right",
      cell: (row) => (
        <span className="num text-xs">{format.moneyCompact(row.discountAmount + row.giftValue)}</span>
      ),
    },
  ];

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<BlockSkeleton className="h-96" />}
          isEmpty={({ data }) =>
            data.totals.fullUnits + data.totals.discountUnits + data.totals.giftUnits === 0
          }
        >
          {({ data }) => (
            <div className="flex flex-col gap-5">
              <SalesMixFlow mix={data} />
              <MixSummary totals={data.totals} />
              <div className="-mx-4 md:-mx-5.5">
                <div className="text-ink-2 mb-1 flex items-center gap-1.5 px-4 text-xs font-semibold md:px-5.5">
                  <Tag aria-hidden className="size-3.5" />
                  {t("byProduct")}
                </div>
                <DataTable columns={columns} rows={data.products} rowKey={(row) => String(row.productId)} />
              </div>
            </div>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
