"use client";

import { OctagonAlert, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { MiniBar } from "@/shared/ui/mini-bar";
import { Pill } from "@/shared/ui/pill";
import { QueryState, TableSkeleton } from "@/shared/ui/states";
import { UserCell } from "@/shared/ui/user-cell";

import { useCourierDrawer } from "../hooks/use-courier-drawer";
import { useCouriersQuery } from "../hooks/use-logistics";
import { codLevel, unsettledDays } from "../model/logistics.rules";
import type { Courier } from "../model/logistics.schema";

/** Kuryerdagi topshirilmagan naqd: qancha uzoq tursa, shuncha jiddiy belgi. */
const UnsettledCod = ({ courier, now }: { courier: Courier; now: string }) => {
  const t = useTranslations("logistics.couriers.unsettled");
  const format = useFormat();
  const level = codLevel(courier, now);
  const value = format.moneyCompact(courier.codUnsettled);

  if (level === "none") return <span className="text-ink-3">—</span>;
  if (level === "overdue") {
    return (
      <Pill intent="crit" icon={OctagonAlert}>
        {t("overdue", { value, count: unsettledDays(courier.oldestUnsettledAt, now) ?? 0 })}
      </Pill>
    );
  }
  if (level === "yesterday") {
    return (
      <Pill intent="warn" icon={TriangleAlert}>
        {t("yesterday", { value })}
      </Pill>
    );
  }
  return <span className="num text-xs">{value}</span>;
};

/** Kuryerlar reytingi va naqd nazorati. Qator bosilsa kuryer kartasi (`?courier=<id>`) ochiladi. */
export const CouriersTable = ({ className }: { className?: string }) => {
  const t = useTranslations("logistics.couriers");
  const format = useFormat();
  const query = useCouriersQuery();
  const { openCourier } = useCourierDrawer();

  /** `now` — javob tuzilgan vaqt: naqd necha kundan beri turgani shunga nisbatan hisoblanadi. */
  const columnsAt = (now: string): Column<Courier>[] => [
    {
      id: "courier",
      header: t("columns.courier"),
      primary: true,
      cell: (row) => <UserCell name={row.fullName} subtitle={row.filial} />,
    },
    {
      id: "delivered",
      header: t("columns.delivered"),
      align: "right",
      cell: (row) => (
        <>
          <span className="num text-xs">
            {formatNumber(row.delivered)} / {formatNumber(row.assigned)}
          </span>
          <MiniBar percent={row.successRate ?? 0} />
        </>
      ),
    },
    {
      id: "successRate",
      header: t("columns.successRate"),
      align: "right",
      numeric: true,
      cell: (row) => formatPercent(row.successRate),
    },
    {
      id: "avgTime",
      header: t("columns.avgTime"),
      align: "right",
      numeric: true,
      cell: (row) => format.duration(row.avgMinutes),
    },
    {
      id: "attempts",
      header: t("columns.attempts"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.attempts),
    },
    {
      id: "codCollected",
      header: t("columns.codCollected"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.codCollected),
    },
    {
      id: "codUnsettled",
      header: t("columns.codUnsettled"),
      align: "right",
      cell: (row) => <UnsettledCod courier={row} now={now} />,
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
          {({ data, generatedAt }) => (
            <DataTable
              columns={columnsAt(generatedAt)}
              rows={data}
              rowKey={(row) => String(row.id)}
              onRowClick={(row) => openCourier(row.id)}
              rowLabel={(row) => t("open", { name: row.fullName })}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
