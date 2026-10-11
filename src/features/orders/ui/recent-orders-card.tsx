"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";

import { ORDER_STATUSES, orderStatusStyle } from "@/shared/config/order-status";
import { useFormat } from "@/shared/hooks/use-format";
import { useOrderDrawer } from "@/shared/hooks/use-order-drawer";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Chip } from "@/shared/ui/chip";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Input } from "@/shared/ui/input";
import { StageBadge } from "@/shared/ui/stage-badge";
import { EmptyState, NoResults, QueryState, TableSkeleton } from "@/shared/ui/states";

import { ORDERS_PAGE_SIZE } from "../api/orders.api";
import { useOrderFilters } from "../hooks/use-order-filters";
import { useOrderLabels } from "../hooks/use-order-labels";
import { useOrdersListQuery } from "../hooks/use-orders";
import type { OrderRow } from "../model/orders.schema";

/** Davrdagi eng so'nggi buyurtmalar: holat filtri va qidiruv URL da, filtrlash serverda. */
export const RecentOrdersCard = ({ className }: { className?: string }) => {
  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const labels = useOrderLabels();
  const searchId = useId();
  const { openOrder } = useOrderDrawer();
  const filters = useOrderFilters();
  const query = useOrdersListQuery({ status: filters.status, search: filters.search });

  const columns: Column<OrderRow>[] = [
    {
      id: "order",
      header: t("recent.columns.order"),
      primary: true,
      cell: (row) => (
        <>
          <b className="num font-semibold">{row.orderNumber}</b>{" "}
          <time dateTime={row.createdAt} className="num text-2xs text-ink-3">
            {format.dateTime(row.createdAt)}
          </time>
        </>
      ),
    },
    { id: "status", header: t("recent.columns.status"), cell: (row) => <StageBadge status={row.status} /> },
    {
      id: "client",
      header: t("recent.columns.client"),
      cell: (row) => (
        <div className="leading-tight">
          {row.client.fullName}
          <div className="text-2xs text-ink-3">
            {labels.region(row.delivery.region, row.delivery.regionDisplay)}
          </div>
        </div>
      ),
    },
    {
      id: "amount",
      header: t("recent.columns.amount"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.payableAmount),
    },
    {
      id: "payment",
      header: t("recent.columns.payment"),
      cell: (row) => labels.paymentMethod(row.payment.method),
    },
    { id: "source", header: t("recent.columns.source"), cell: (row) => labels.source(row.source) },
  ];

  return (
    <Card className={className}>
      <CardHeader title={t("recent.title")} description={t("recent.description")} />
      <div className="flex flex-col gap-2.5 px-3.5 pt-3 md:px-4.5 lg:flex-row lg:items-center">
        <div role="group" aria-label={t("recent.statusFilter")} className="flex flex-wrap gap-1.5">
          <Chip pressed={filters.status === null} onClick={() => filters.setStatus(null)}>
            {tCommon("all")}
          </Chip>
          {ORDER_STATUSES.map((status) => (
            <Chip key={status} pressed={filters.status === status} onClick={() => filters.setStatus(status)}>
              <span
                aria-hidden
                className={cn("size-2 shrink-0 rounded-full", orderStatusStyle(status).dot)}
              />
              {tCommon(`orderStatus.${status}`)}
            </Chip>
          ))}
        </div>
        <div className="relative lg:ml-auto lg:w-60">
          <label htmlFor={searchId} className="sr-only">
            {t("recent.searchLabel")}
          </label>
          <Search
            aria-hidden
            className="text-ink-3 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            id={searchId}
            type="search"
            className="pl-9"
            placeholder={t("recent.searchPlaceholder")}
            value={filters.query}
            onChange={(event) => filters.setQuery(event.target.value)}
          />
        </div>
      </div>
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={ORDERS_PAGE_SIZE} />}
          isEmpty={(list) => list.results.length === 0}
          empty={
            filters.hasFilters ? (
              <NoResults query={filters.search || undefined} onClear={filters.clear} />
            ) : (
              <EmptyState />
            )
          }
        >
          {(list) => (
            <>
              <DataTable
                columns={columns}
                rows={list.results}
                rowKey={(row) => row.id}
                onRowClick={(row) => openOrder(row.id)}
                rowLabel={(row) => t("openOrder", { number: row.orderNumber })}
              />
              {list.count > list.results.length ? (
                <p className="text-2xs text-ink-3 border-t px-3.5 pt-2.5 pb-1 md:px-4.5">
                  {t("recent.shown", {
                    shown: formatNumber(list.results.length),
                    total: formatNumber(list.count),
                  })}
                </p>
              ) : null}
            </>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
