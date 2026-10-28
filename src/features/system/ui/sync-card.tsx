"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { DrawerSection } from "@/shared/ui/drawer";
import { Pill } from "@/shared/ui/pill";
import { QueryState, TableSkeleton } from "@/shared/ui/states";

import { useSyncQuery } from "../hooks/use-system";
import type { Sync } from "../model/system.schema";

type Source = Sync["sources"][number];

/** Bitrix, ERP marketplace va boshqa manbalardan import: oxirgi ishga tushish, xatolar. */
export const SyncCard = ({ className }: { className?: string }) => {
  const t = useTranslations("system.sync");
  const tNames = useTranslations("system.components.names");
  const format = useFormat();
  const relative = useRelativeTime();
  const query = useSyncQuery();
  const name = (source: string) => (tNames.has(source) ? tNames(source) : source);

  const columns: Column<Source>[] = [
    {
      id: "source",
      header: t("columns.source"),
      primary: true,
      cell: (row) => <span className="font-medium">{name(row.source)}</span>,
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: (row) => (
        <Pill intent={row.status === "ok" ? "good" : row.status === "failed" ? "crit" : "warn"}>
          {row.status === "ok" || row.status === "failed" || row.status === "running"
            ? t(`status.${row.status}`)
            : row.status}
        </Pill>
      ),
    },
    {
      id: "last",
      header: t("columns.last"),
      align: "right",
      cell: (row) => (row.lastRunAt ? relative(row.lastRunAt) : "—"),
    },
    {
      id: "imported",
      header: t("columns.imported"),
      align: "right",
      numeric: true,
      cell: (row) => formatNumber(row.imported),
    },
    {
      id: "failed",
      header: t("columns.failed"),
      align: "right",
      cell: (row) =>
        row.failed > 0 ? (
          <span className="num text-crit text-xs font-semibold">{formatNumber(row.failed)}</span>
        ) : (
          <span className="text-ink-3">0</span>
        ),
    },
  ];

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody flush>
        <QueryState query={query} skeleton={<TableSkeleton rows={4} />}>
          {(sync) => (
            <>
              <DataTable
                columns={columns}
                rows={sync.sources}
                rowKey={(row) => row.source}
                keepTableOnMobile
              />
              {sync.errors.length > 0 ? (
                <div className="px-3.5 pt-3 pb-3.5 md:px-4.5">
                  <DrawerSection title={t("errors")}>
                    <ul className="flex flex-col gap-1.5">
                      {sync.errors.slice(0, 8).map((error) => (
                        <li key={error.id} className="bg-crit-soft/50 rounded-lg px-3 py-2 text-xs">
                          <div className="text-2xs text-ink-3">
                            {name(error.source)} · {format.dateTime(error.at)}
                            {error.entityRef ? ` · ${error.entityRef}` : ""}
                          </div>
                          {error.message}
                        </li>
                      ))}
                    </ul>
                  </DrawerSection>
                </div>
              ) : null}
            </>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
