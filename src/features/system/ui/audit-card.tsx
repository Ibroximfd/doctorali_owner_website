"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Pill } from "@/shared/ui/pill";
import { QueryState, TableSkeleton } from "@/shared/ui/states";

import { useAuditQuery } from "../hooks/use-system";
import type { AuditEntry } from "../model/system.schema";

const PAGE_SIZE = 25;
const KNOWN_ACTIONS = ["login", "logout", "export", "notify", "update", "create", "delete", "ai_run"];

/** Kim, qachon, nima qildi — panel jurnali (sahifalab). */
export const AuditCard = ({ className }: { className?: string }) => {
  const t = useTranslations("system.audit");
  const format = useFormat();
  const [page, setPage] = useState(1);
  const query = useAuditQuery(page);

  const columns: Column<AuditEntry>[] = [
    {
      id: "at",
      header: t("columns.at"),
      cell: (row) => <span className="num text-xs">{format.dateTime(row.at)}</span>,
    },
    {
      id: "actor",
      header: t("columns.actor"),
      primary: true,
      cell: (row) => <span className="font-medium">{row.actor}</span>,
    },
    {
      id: "action",
      header: t("columns.action"),
      cell: (row) => (
        <Pill>{KNOWN_ACTIONS.includes(row.action) ? t(`action.${row.action}`) : row.action}</Pill>
      ),
    },
    {
      id: "summary",
      header: t("columns.summary"),
      cell: (row) => <span className="text-ink-2 text-xs">{row.summary}</span>,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={8} />}
          isEmpty={(data) => data.results.length === 0}
        >
          {(data) => {
            const pages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));
            return (
              <>
                <DataTable columns={columns} rows={data.results} rowKey={(row) => String(row.id)} />
                <div className="text-ink-3 flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs md:px-4.5">
                  <span>{t("total", { count: formatNumber(data.count) })}</span>
                  <span className="flex items-center gap-2">
                    <Button size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                      {t("prev")}
                    </Button>
                    <span className="num">
                      {page} / {pages}
                    </span>
                    <Button size="sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>
                      {t("next")}
                    </Button>
                  </span>
                </div>
              </>
            );
          }}
        </QueryState>
      </CardBody>
    </Card>
  );
};
