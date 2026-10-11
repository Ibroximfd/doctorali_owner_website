"use client";

import { Check, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Pill, type PillIntent } from "@/shared/ui/pill";
import { QueryState, TableSkeleton } from "@/shared/ui/states";

import { useClinicBranchesQuery } from "../hooks/use-clinic";
import { closingState, type ClosingState } from "../model/clinic.rules";
import type { ClinicBranch } from "../model/clinic.schema";

const CLOSING_PILL: Record<Exclude<ClosingState, "unknown">, { intent: PillIntent; icon: LucideIcon }> = {
  balanced: { intent: "good", icon: Check },
  shortage: { intent: "crit", icon: OctagonAlert },
  surplus: { intent: "warn", icon: TriangleAlert },
  open: { intent: "crit", icon: OctagonAlert },
  reopened: { intent: "warn", icon: TriangleAlert },
};

/** Kechagi kassa yopilishi: farqsiz yopilgan — yashil, kamomad yoki yopilmagan — qizil. */
const ClosingPill = ({ branch }: { branch: ClinicBranch }) => {
  const t = useTranslations("clinic.branches.closing");
  const state = closingState(branch.closingStatus, branch.closingDifference);
  // Klinikasi yo'q filial (`null`) yoki noma'lum holat — chizgich.
  if (state === "unknown")
    return branch.closingStatus ? <Pill>{branch.closingStatus}</Pill> : <span className="text-ink-3">—</span>;

  const { intent, icon } = CLOSING_PILL[state];
  return (
    <Pill intent={intent} icon={icon}>
      {t(state, { value: formatNumber(Math.abs(branch.closingDifference ?? 0)) })}
    </Pill>
  );
};

/** Klinikasi bor filiallar: aylanma, kassa, qarz, ombor va intizom bitta qatorda. */
export const BranchesTable = ({ className }: { className?: string }) => {
  const t = useTranslations("clinic.branches");
  const format = useFormat();
  const query = useClinicBranchesQuery();

  const columns: Column<ClinicBranch>[] = [
    {
      id: "name",
      header: t("columns.name"),
      primary: true,
      cell: (row) => <span className="font-semibold">{row.name}</span>,
    },
    {
      id: "revenue",
      header: t("columns.revenue"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.revenue),
    },
    {
      id: "visits",
      header: t("columns.visits"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.visitsArrived),
    },
    {
      id: "noShow",
      header: t("columns.noShow"),
      align: "right",
      numeric: true,
      cell: (row) => formatPercent(row.noShowRate),
    },
    {
      id: "till",
      header: t("columns.till"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.tills),
    },
    {
      id: "debt",
      header: t("columns.openDebt"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.openDebt),
    },
    {
      id: "stock",
      header: t("columns.stockValue"),
      align: "right",
      numeric: true,
      cell: (row) => format.moneyCompact(row.stockValue),
    },
    {
      id: "attendance",
      header: t("columns.attendance"),
      align: "right",
      numeric: true,
      cell: (row) => formatPercent(row.attendanceRate, 0),
    },
    { id: "closing", header: t("columns.closing"), cell: (row) => <ClosingPill branch={row} /> },
  ];

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={2} />}
          isEmpty={({ data }) => data.length === 0}
        >
          {({ data }) => <DataTable columns={columns} rows={data} rowKey={(row) => String(row.id)} />}
        </QueryState>
      </CardBody>
    </Card>
  );
};
