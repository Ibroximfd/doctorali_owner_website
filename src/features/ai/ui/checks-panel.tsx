"use client";

import { CircleCheck, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Pill, type PillIntent } from "@/shared/ui/pill";
import { QueryState, TableSkeleton } from "@/shared/ui/states";

import { useChecksQuery } from "../hooks/use-ai";
import { checkRank, isCheckStatus, type CheckStatus } from "../model/ai.rules";
import type { AiCheck } from "../model/ai.schema";

const STATUS_PILL: Record<CheckStatus, { intent: PillIntent; icon: LucideIcon }> = {
  fail: { intent: "crit", icon: OctagonAlert },
  warn: { intent: "warn", icon: TriangleAlert },
  pass: { intent: "good", icon: CircleCheck },
};

/** Deterministik tekshiruvlar (AI siz): ikki manba solishtiriladi — kutilgan, haqiqiy, farq. */
export const ChecksPanel = () => {
  const t = useTranslations("ai.checks");
  const format = useFormat();
  const relative = useRelativeTime();
  const query = useChecksQuery();

  const valueOf = (value: number | null, unit: string): string => {
    if (value === null) return "—";
    if (unit === "uzs") return format.moneyCompact(value);
    if (unit === "pct") return formatPercent(value);
    return formatNumber(value);
  };

  const columns: Column<AiCheck>[] = [
    {
      id: "title",
      header: t("columns.check"),
      primary: true,
      cell: (row) => (
        <div className="min-w-0">
          <div className="text-sm font-medium">{row.title}</div>
          <div className="text-2xs text-ink-3">{row.sources.join(" ↔ ")}</div>
        </div>
      ),
    },
    {
      id: "expected",
      header: t("columns.expected"),
      align: "right",
      numeric: true,
      cell: (row) => valueOf(row.expected, row.unit),
    },
    {
      id: "actual",
      header: t("columns.actual"),
      align: "right",
      numeric: true,
      cell: (row) => valueOf(row.actual, row.unit),
    },
    {
      id: "diff",
      header: t("columns.diff"),
      align: "right",
      cell: (row) =>
        row.diff === null || row.diff === 0 ? (
          <span className="text-ink-3">—</span>
        ) : (
          <span className="num text-crit text-xs font-semibold">{valueOf(row.diff, row.unit)}</span>
        ),
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: (row) => {
        if (!isCheckStatus(row.status)) return <Pill>{row.status}</Pill>;
        const { intent, icon } = STATUS_PILL[row.status];
        return (
          <Pill intent={intent} icon={icon}>
            {t(`status.${row.status}`)}
          </Pill>
        );
      },
    },
    { id: "checked", header: t("columns.checked"), align: "right", cell: (row) => relative(row.checkedAt) },
  ];

  return (
    <Card>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody flush>
        <QueryState query={query} skeleton={<TableSkeleton rows={8} />} isEmpty={(rows) => rows.length === 0}>
          {(rows) => (
            <DataTable
              columns={columns}
              rows={[...rows].sort((a, b) => checkRank(a.status) - checkRank(b.status))}
              rowKey={(row) => row.code}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
