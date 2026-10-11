"use client";

import { useTranslations } from "next-intl";

import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { MiniBar } from "@/shared/ui/mini-bar";
import { QueryState, TableSkeleton } from "@/shared/ui/states";

import { useLeadSourcesQuery } from "../hooks/use-sales";
import { isHighConversion, shareOfMax } from "../model/sales.rules";
import type { LeadSource } from "../model/sales.schema";

/** Lid manbalari: soni va buyurtmaga aylanish ulushi (yuqori konversiya yashil). */
export const LeadSourcesCard = ({ className }: { className?: string }) => {
  const t = useTranslations("sales.sources");
  const query = useLeadSourcesQuery();

  const sources = query.data?.data ?? [];
  const maxConversion = Math.max(0, ...sources.map((row) => row.conversionPct));
  // yangi manba backendda paydo bo'lsa, tarjimasi chiqquncha kaliti ko'rsatiladi
  const sourceName = (source: string): string => (t.has(`names.${source}`) ? t(`names.${source}`) : source);

  const columns: Column<LeadSource>[] = [
    {
      id: "source",
      header: t("columns.source"),
      cell: (row) => <span className="font-medium">{sourceName(row.source)}</span>,
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
      cell: (row) => (
        <>
          <span className="num text-xs">{formatPercent(row.conversionPct)}</span>
          <MiniBar
            percent={shareOfMax(row.conversionPct, maxConversion)}
            barClassName={isHighConversion(row.conversionPct) ? "bg-order-delivered" : undefined}
          />
        </>
      ),
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
          {({ data }) => (
            <DataTable keepTableOnMobile columns={columns} rows={data} rowKey={(row) => row.source} />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
