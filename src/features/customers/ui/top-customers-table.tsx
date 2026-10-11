"use client";

import { Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber, formatPhone } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Pill } from "@/shared/ui/pill";
import { QueryState, TableSkeleton } from "@/shared/ui/states";
import { UserCell } from "@/shared/ui/user-cell";

import { useRegionName, useTopCustomersQuery } from "../hooks/use-customers";
import type { TopCustomer } from "../model/customers.schema";

const DASH = "—";

/** Jami xarid summasi bo'yicha eng qimmatli mijozlar. */
export const TopCustomersTable = ({ className }: { className?: string }) => {
  const t = useTranslations("customers.top");
  const format = useFormat();
  const regionName = useRegionName();
  const query = useTopCustomersQuery();

  const columns: Column<TopCustomer>[] = [
    {
      id: "customer",
      header: t("columns.customer"),
      primary: true,
      cell: (row) => (
        <UserCell
          name={row.fullName}
          subtitle={[row.region === null ? null : regionName(row.region), formatPhone(row.phone)]
            .filter(Boolean)
            .join(" · ")}
        />
      ),
    },
    {
      id: "orders",
      header: t("columns.orders"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.ordersCount),
    },
    {
      id: "spent",
      header: t("columns.spent"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.totalSpent),
    },
    {
      id: "lastOrder",
      header: t("columns.lastOrder"),
      align: "right",
      numeric: true,
      cell: (row) =>
        row.lastOrderAt === null ? <span className="text-ink-3">{DASH}</span> : format.date(row.lastOrderAt),
    },
    {
      id: "app",
      header: t("columns.app"),
      cell: (row) =>
        row.hasApp ? (
          <Pill intent="good" icon={Smartphone}>
            {t("hasApp")}
          </Pill>
        ) : (
          <Pill intent="neutral">{t("noApp")}</Pill>
        ),
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
          {({ data }) => <DataTable columns={columns} rows={data} rowKey={(row) => String(row.leadId)} />}
        </QueryState>
      </CardBody>
    </Card>
  );
};
