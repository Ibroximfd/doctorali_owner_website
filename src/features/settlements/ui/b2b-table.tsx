"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { useRegionName } from "@/shared/meta/use-region-name";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Pill } from "@/shared/ui/pill";
import { QueryState, TableSkeleton } from "@/shared/ui/states";

import { useB2bQuery } from "../hooks/use-settlements";
import { OVERDUE_DAYS } from "../model/settlements.rules";
import type { B2bClient } from "../model/settlements.schema";

/** B2B dorixonalar: olgan, to'lagan va qarzi (eng eski qarz kuni bilan). */
export const B2bTable = ({ className }: { className?: string }) => {
  const t = useTranslations("settlements.b2b");
  const format = useFormat();
  const regionName = useRegionName();
  const query = useB2bQuery();

  const columns: Column<B2bClient>[] = [
    {
      id: "name",
      header: t("columns.name"),
      primary: true,
      cell: (row) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{row.name}</div>
          <div className="text-2xs text-ink-3">
            {row.region ? regionName(row.region) : "—"} · {t("sales", { count: row.salesCount })}
          </div>
        </div>
      ),
    },
    {
      id: "amount",
      header: t("columns.amount"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.amount),
    },
    {
      id: "paid",
      header: t("columns.paid"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.paid),
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
      id: "age",
      header: t("columns.age"),
      align: "right",
      cell: (row) =>
        row.oldestDebtDays === null ? (
          <span className="text-ink-3">—</span>
        ) : row.oldestDebtDays > OVERDUE_DAYS ? (
          <Pill intent="crit">{t("days", { count: row.oldestDebtDays })}</Pill>
        ) : (
          <span className="num text-xs">{t("days", { count: row.oldestDebtDays })}</span>
        ),
    },
    {
      id: "lastSale",
      header: t("columns.lastSale"),
      align: "right",
      cell: (row) => (row.lastSaleAt ? format.date(row.lastSaleAt) : "—"),
    },
  ];

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={6} />}
          isEmpty={({ data }) => data.length === 0}
        >
          {({ data }) => (
            <DataTable
              columns={columns.map((column) =>
                column.id === "debt"
                  ? { ...column, footer: format.moneyCompact(data.reduce((sum, row) => sum + row.debt, 0)) }
                  : column.id === "name"
                    ? { ...column, footer: t("total", { count: formatNumber(data.length) }) }
                    : column,
              )}
              rows={[...data].sort((a, b) => b.debt - a.debt)}
              rowKey={(row) => String(row.id)}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
