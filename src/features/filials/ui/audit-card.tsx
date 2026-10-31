"use client";

import { History } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useAuditQuery } from "../hooks/use-filials";
import { auditNumber, auditPerson } from "../model/filials.rules";
import type { FilialItem } from "../model/filials.schema";

const SHOWN = 15;

/** Tuzilma tarixi (`structure/audit/`): kim, qachon, qaysi filialda nima o'zgardi. */
export const AuditCard = ({ filials }: { filials: readonly FilialItem[] }) => {
  const t = useTranslations("filials.audit");
  const format = useFormat();
  const query = useAuditQuery();
  const nameOf = (id: number | null) =>
    id === null ? null : (filials.find((filial) => filial.id === id)?.name ?? `#${id}`);

  return (
    <Card>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={5} />}
          isEmpty={(rows) => rows.length === 0}
          empty={<StateBlock icon={History} title={t("emptyTitle")} description={t("emptyDescription")} />}
        >
          {(rows) => (
            <ul className="flex flex-col divide-y">
              {rows.slice(0, SHOWN).map((row) => {
                const filial = nameOf(auditNumber(row, "filialId"));
                const person = auditPerson(row);
                return (
                  <li
                    key={`${row.at}-${row.action}-${row.endpoint}`}
                    className="flex flex-wrap gap-x-3 gap-y-0.5 py-2.5 text-sm"
                  >
                    <span className="num text-ink-3 w-32 shrink-0 text-xs">{format.dateTime(row.at)}</span>
                    <span className="min-w-0 flex-1">
                      {t.has(`actions.${row.action}`) ? t(`actions.${row.action}`) : row.action}
                      {person ? <span className="font-medium"> · {person}</span> : null}
                      {filial ? <span className="text-ink-3"> · {filial}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
