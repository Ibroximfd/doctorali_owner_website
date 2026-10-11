"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { MiniBar } from "@/shared/ui/mini-bar";
import { Rating } from "@/shared/ui/rating";
import { QueryState, TableSkeleton } from "@/shared/ui/states";
import { UserCell } from "@/shared/ui/user-cell";

import { useDoctorsQuery } from "../hooks/use-doctors";
import { doctorSubtitle, rankDoctors, type RankedDoctor } from "../model/doctors.rules";

/** Shifokor qancha olib kelyapti: sotuv bo'yicha reyting, qabul, komissiya va to'lanmagan qoldiq. */
export const DoctorsRanking = ({ className }: { className?: string }) => {
  const t = useTranslations("doctors.ranking");
  const format = useFormat();
  const query = useDoctorsQuery();

  const columns: Column<RankedDoctor>[] = [
    {
      id: "doctor",
      header: t("columns.doctor"),
      primary: true,
      cell: (row) => <UserCell name={row.fullName} subtitle={doctorSubtitle(row)} rank={row.rank} />,
    },
    {
      id: "sales",
      header: t("columns.sales"),
      align: "right",
      cell: (row) => (
        <>
          <span className="num text-xs">{format.moneyCompact(row.salesAmount)}</span>
          <MiniBar percent={row.salesShare} />
        </>
      ),
    },
    {
      id: "online",
      header: t("columns.online"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.onlineConsultations),
    },
    {
      id: "visits",
      header: t("columns.visits"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.clinicVisits),
    },
    {
      id: "orders",
      header: t("columns.orders"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.ordersCreated),
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
    {
      id: "rating",
      header: t("columns.rating"),
      align: "right",
      // Hali baholanmagan shifokor «0,0» qizil bo'lib yomon ko'rinmasin.
      cell: (row) =>
        row.ratingCount === 0 || row.ratingAvg === null ? (
          <span className="text-ink-3">—</span>
        ) : (
          <Rating value={row.ratingAvg} count={row.ratingCount} />
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
          {({ data }) => (
            <DataTable columns={columns} rows={rankDoctors(data)} rowKey={(row) => String(row.id)} />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
