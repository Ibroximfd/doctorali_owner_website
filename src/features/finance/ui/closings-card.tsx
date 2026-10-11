"use client";

import { Check, Clock, RefreshCw, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Pill, type PillIntent } from "@/shared/ui/pill";
import { QueryState, TableSkeleton } from "@/shared/ui/states";

import { useDailyClosingsQuery } from "../hooks/use-finance";
import { differenceKind, formatSigned, isClosingStatus, type ClosingStatus } from "../model/finance.rules";
import type { DailyClosing } from "../model/finance.schema";

const DASH = "—";

const STATUS_PILL: Record<ClosingStatus, { intent: PillIntent; icon: LucideIcon }> = {
  closed: { intent: "good", icon: Check },
  open: { intent: "info", icon: Clock },
  reopened: { intent: "warn", icon: RefreshCw },
};

/** Sanalgan va kutilgan naqd farqi: ishora matnda, rang faqat kuchaytiradi. */
const Difference = ({ value }: { value: number | null }) => {
  if (value === null) return <span className="text-ink-3">{DASH}</span>;
  const kind = differenceKind(value);
  return (
    <span className={cn(kind === "shortage" && "text-crit", kind === "surplus" && "text-warn")}>
      {formatSigned(value)}
    </span>
  );
};

/** Klinika filiallarining kunlik kassa yopilishi. */
export const ClosingsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("finance.closings");
  const format = useFormat();
  const query = useDailyClosingsQuery();

  const columns: Column<DailyClosing>[] = [
    {
      id: "date",
      header: t("columns.date"),
      primary: true,
      cell: (row) => <span className="num font-semibold">{format.bucket(row.date, "day")}</span>,
    },
    { id: "filial", header: t("columns.filial"), cell: (row) => row.filial },
    {
      id: "status",
      header: t("columns.status"),
      cell: (row) => {
        // Noma'lum (yangi) holat yiqitmaydi — qiymatning o'zi neytral belgida.
        if (!isClosingStatus(row.status)) return <Pill>{row.status}</Pill>;
        const { intent, icon } = STATUS_PILL[row.status];
        return (
          <Pill intent={intent} icon={icon}>
            {t(`status.${row.status}`)}
          </Pill>
        );
      },
    },
    {
      id: "difference",
      header: t("columns.difference"),
      align: "right",
      numeric: true,
      cell: (row) => <Difference value={row.difference} />,
    },
    {
      id: "closedBy",
      header: t("columns.closedBy"),
      cell: (row) => row.closedBy ?? <span className="text-ink-3">{DASH}</span>,
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
            <DataTable columns={columns} rows={data} rowKey={(row) => `${row.date}:${row.filial}`} />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
