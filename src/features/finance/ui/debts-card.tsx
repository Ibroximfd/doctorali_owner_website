"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Pill } from "@/shared/ui/pill";
import { StackedBar } from "@/shared/ui/stacked-bar";
import { EmptyState, QueryState, TableSkeleton } from "@/shared/ui/states";

import { useDebtsQuery } from "../hooks/use-finance";
import { agingBucketKey, agingColorClass, debtTotals, overdueTone } from "../model/finance.rules";
import type { Debtor } from "../model/finance.schema";

/** Mijozlar qarzi: muddat bo'yicha tarkib (tartibli ranglar) va eng katta qarzdorlar. */
export const DebtsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("finance.debts");
  const format = useFormat();
  const query = useDebtsQuery();
  const totals = query.data ? debtTotals(query.data.data) : null;

  const columns: Column<Debtor>[] = [
    {
      id: "debtor",
      header: t("columns.debtor"),
      primary: true,
      cell: (row) => (
        <div className="leading-tight">
          <div className="font-semibold">{row.client}</div>
          {row.filial ? <div className="text-2xs text-ink-3">{row.filial}</div> : null}
        </div>
      ),
    },
    {
      id: "remaining",
      header: t("columns.remaining"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.remaining),
    },
    {
      id: "overdue",
      header: t("columns.overdue"),
      align: "right",
      cell: (row) => {
        const tone = overdueTone(row.overdueDays);
        return (
          <Pill intent={tone} icon={tone === "crit" ? TriangleAlert : undefined}>
            {t("days", { count: row.overdueDays })}
          </Pill>
        );
      },
    },
  ];

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={
          totals
            ? t("summary", { value: format.money(totals.amount), count: formatNumber(totals.clients) })
            : undefined
        }
      />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={5} />}
          isEmpty={({ data }) => debtTotals(data).amount <= 0 && data.topDebtors.length === 0}
          empty={<EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />}
        >
          {({ data }) => (
            <>
              <StackedBar
                className="px-3.5 pb-3 md:px-4.5"
                legend="block"
                ariaLabel={t("agingLabel")}
                format={format.moneyCompact}
                items={data.aging.map((row, index) => {
                  const bucketKey = agingBucketKey(row.bucket);
                  return {
                    key: row.bucket,
                    label: bucketKey ? t(`bucket.${bucketKey}`) : row.bucket,
                    value: row.amount,
                    colorClassName: agingColorClass(index),
                  };
                })}
              />
              <DataTable
                columns={columns}
                rows={data.topDebtors}
                rowKey={(row) => `${row.client}:${row.phone ?? ""}`}
              />
            </>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
