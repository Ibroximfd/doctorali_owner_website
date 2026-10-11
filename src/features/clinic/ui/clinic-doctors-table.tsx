"use client";

import { useTranslations } from "next-intl";

import { routes } from "@/shared/config/routes";
import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { CardLink } from "@/shared/ui/card-link";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { QueryState, TableSkeleton } from "@/shared/ui/states";
import { UserCell } from "@/shared/ui/user-cell";

import { useClinicDoctorsQuery } from "../hooks/use-clinic";
import { topDoctors } from "../model/clinic.rules";
import type { ClinicDoctor } from "../model/clinic.schema";

const TOP_DOCTORS = 5;

/** Klinikadagi eng ko'p sotgan shifokorlar; to'liq reyting — "Shifokorlar" bo'limida. */
export const ClinicDoctorsTable = ({ className }: { className?: string }) => {
  const t = useTranslations("clinic.doctors");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const query = useClinicDoctorsQuery();

  const columns: Column<ClinicDoctor>[] = [
    {
      id: "doctor",
      header: t("columns.doctor"),
      primary: true,
      cell: (row) => <UserCell name={row.doctor} subtitle={`${row.specialty} · ${row.filial}`} />,
    },
    {
      id: "visits",
      header: t("columns.visits"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.visits),
    },
    {
      id: "sales",
      header: t("columns.sales"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.salesRevenue),
    },
    {
      id: "commission",
      header: t("columns.commission"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.commissionEarned),
    },
    {
      id: "outstanding",
      header: t("columns.outstanding"),
      align: "right",
      numeric: true,
      cell: (row) =>
        row.payoutOutstanding > 0 ? (
          <span className="text-serious">{format.moneyCompact(row.payoutOutstanding)}</span>
        ) : (
          <span className="text-ink-3">0</span>
        ),
    },
  ];

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={t("description")}
        action={<CardLink href={routes.doctors}>{tCommon("details")}</CardLink>}
      />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={TOP_DOCTORS} />}
          isEmpty={({ data }) => data.length === 0}
        >
          {({ data }) => (
            <DataTable
              columns={columns}
              rows={topDoctors(data, TOP_DOCTORS)}
              rowKey={(row) => `${row.doctor}·${row.filial}·${row.specialty}`}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
