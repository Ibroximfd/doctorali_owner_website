"use client";

import { Check, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { useOrderDrawer } from "@/shared/hooks/use-order-drawer";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Pill } from "@/shared/ui/pill";
import { StageBadge } from "@/shared/ui/stage-badge";
import { QueryState, StateBlock, TableSkeleton } from "@/shared/ui/states";

import { useStuckOrdersQuery } from "../hooks/use-orders";
import { useOrderLabels } from "../hooks/use-order-labels";
import { oldestFirst, stuckHolder } from "../model/orders.rules";
import type { StuckOrder } from "../model/orders.schema";

const DASH = "—";

/** Qoidadan oshib turgan buyurtmalar (hozirgi holat) — eng eskisi yuqorida; qator kartani ochadi. */
export const StuckOrdersCard = ({ className }: { className?: string }) => {
  const t = useTranslations("orders");
  const labels = useOrderLabels();
  const { openOrder } = useOrderDrawer();
  const query = useStuckOrdersQuery();
  const count = query.data?.data.count ?? 0;

  const holderName = (row: StuckOrder): string => {
    const holder = stuckHolder(row);
    if (holder.kind === "person") return holder.name;
    return holder.kind === "no_courier" ? t("stuck.noCourier") : DASH;
  };

  const columns: Column<StuckOrder>[] = [
    {
      id: "order",
      header: t("stuck.columns.order"),
      primary: true,
      cell: (row) => (
        <div>
          <b className="num font-semibold">{row.orderNumber}</b>
          <StageBadge status={row.status} className="text-ink-2 mt-0.5 flex" />
        </div>
      ),
    },
    {
      id: "holder",
      header: t("stuck.columns.holder"),
      cell: (row) => (
        <div className="leading-tight">
          {holderName(row)}
          {row.filial ? <div className="text-2xs text-ink-3">{row.filial}</div> : null}
        </div>
      ),
    },
    {
      id: "waiting",
      header: t("stuck.columns.waiting"),
      align: "right",
      cell: (row) => (
        <div className="leading-tight">
          <span className="num text-xs">{t("stuck.hours", { count: formatNumber(row.hoursInStatus) })}</span>
          <div className="text-2xs text-ink-3">{labels.stuckRule(row.rule)}</div>
        </div>
      ),
    },
    {
      id: "amount",
      header: t("stuck.columns.amount"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.amount),
    },
  ];

  return (
    <Card className={className}>
      <CardHeader
        title={t("stuck.title")}
        description={t("stuck.description")}
        action={
          count > 0 ? (
            <Pill intent="serious" icon={TriangleAlert}>
              {t("stuck.count", { count: formatNumber(count) })}
            </Pill>
          ) : undefined
        }
      />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={5} />}
          isEmpty={({ data }) => data.results.length === 0}
          empty={
            <StateBlock
              icon={Check}
              title={t("stuck.emptyTitle")}
              description={t("stuck.emptyDescription")}
            />
          }
        >
          {({ data }) => (
            <DataTable
              columns={columns}
              rows={oldestFirst(data.results)}
              rowKey={(row) => row.id}
              onRowClick={(row) => openOrder(row.id)}
              rowLabel={(row) => t("openOrder", { number: row.orderNumber })}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
