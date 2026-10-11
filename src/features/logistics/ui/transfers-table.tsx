"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Pill, type PillIntent } from "@/shared/ui/pill";
import { QueryState, TableSkeleton } from "@/shared/ui/states";

import { useTransfersQuery } from "../hooks/use-logistics";
import { isTransferStatus, type TransferStatus } from "../model/logistics.rules";
import type { Transfer } from "../model/logistics.schema";

const STATUS_INTENT: Record<TransferStatus, PillIntent> = {
  pending: "warn",
  in_transit: "info",
  received: "good",
};

const TransferStatusPill = ({ status }: { status: string }) => {
  const t = useTranslations("logistics.transfers.status");
  // yangi (noma'lum) holat neytral belgida, o'z nomi bilan ko'rsatiladi
  if (!isTransferStatus(status)) return <Pill>{status}</Pill>;
  return <Pill intent={STATUS_INTENT[status]}>{t(status)}</Pill>;
};

/** Filiallar orasida mahsulot ko'chirish: qayerdan qayerga, qaysi bosqichda. */
export const TransfersTable = ({ className }: { className?: string }) => {
  const t = useTranslations("logistics.transfers");
  const format = useFormat();
  const query = useTransfersQuery();

  const columns: Column<Transfer>[] = [
    {
      id: "number",
      header: t("columns.number"),
      primary: true,
      cell: (row) => <span className="num font-semibold">{row.number}</span>,
    },
    { id: "route", header: t("columns.route"), cell: (row) => `${row.fromFilial} → ${row.toFilial}` },
    { id: "status", header: t("columns.status"), cell: (row) => <TransferStatusPill status={row.status} /> },
    {
      id: "items",
      header: t("columns.items"),
      align: "right",
      numeric: true,
      cell: (row) => t("items", { count: row.itemsCount }),
    },
    {
      id: "date",
      header: t("columns.date"),
      align: "right",
      numeric: true,
      cell: (row) => format.date(row.createdAt),
    },
  ];

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={3} />}
          isEmpty={({ data }) => data.length === 0}
        >
          {({ data }) => <DataTable columns={columns} rows={data} rowKey={(row) => String(row.id)} />}
        </QueryState>
      </CardBody>
    </Card>
  );
};
