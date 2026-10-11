"use client";

import { useTranslations } from "next-intl";

import { useMetaQuery } from "@/shared/meta/use-meta-query";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Pill } from "@/shared/ui/pill";
import { EmptyState, QueryState, TableSkeleton } from "@/shared/ui/states";
import { UserCell } from "@/shared/ui/user-cell";

import { useAccessQuery } from "../hooks/use-settings";
import { filialNames, isKnownRole, isSectionKey } from "../model/settings.rules";
import type { AccessUser } from "../model/settings.schema";

/** Panelni kim ko'radi: bo'limlar, filiallar va telefonlar ko'rinishi. Faqat o'qish — huquqni backend beradi. */
export const AccessCard = ({ className }: { className?: string }) => {
  const t = useTranslations("settings.access");
  const tNav = useTranslations("nav");
  const query = useAccessQuery();
  const filials = useMetaQuery().data?.filials ?? [];

  const columns: Column<AccessUser>[] = [
    {
      id: "user",
      header: t("columns.user"),
      primary: true,
      cell: (user) => (
        <UserCell
          name={user.fullName}
          subtitle={isKnownRole(user.role) ? t(`roles.${user.role}`) : user.role}
        />
      ),
    },
    {
      id: "sections",
      header: t("columns.sections"),
      cell: (user) => (
        <span className="whitespace-normal">
          {user.sections.length === 0
            ? t("allSections")
            : user.sections
                .map((section) => (isSectionKey(section) ? tNav(`items.${section}`) : section))
                .join(", ")}
        </span>
      ),
    },
    {
      id: "filials",
      header: t("columns.filials"),
      cell: (user) => (
        <span className="whitespace-normal">
          {user.filials.length === 0 ? t("allFilials") : filialNames(user.filials, filials).join(", ")}
        </span>
      ),
    },
    {
      id: "phones",
      header: t("columns.phones"),
      cell: (user) =>
        user.maskPii ? (
          <Pill intent="neutral">{t("phonesMasked")}</Pill>
        ) : (
          <Pill intent="good">{t("phonesFull")}</Pill>
        ),
    },
  ];

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={3} />}
          isEmpty={(users) => users.length === 0}
          empty={<EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />}
        >
          {(users) => <DataTable columns={columns} rows={users} rowKey={(user) => String(user.id)} />}
        </QueryState>
      </CardBody>
    </Card>
  );
};
