"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { routes } from "@/shared/config/routes";
import { alertRoute } from "@/shared/domain/alert";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { AlertItem } from "@/shared/ui/alert-item";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { CardLink } from "@/shared/ui/card-link";
import { ScopeLink } from "@/shared/ui/scope-link";
import { ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useOverviewQuery } from "../hooks/use-overview";

/** Eng muhim ochiq signallar — boshliq muammoni qidirmaydi, tizim o'zi ko'rsatadi. */
export const AttentionCard = ({ className }: { className?: string }) => {
  const t = useTranslations("overview.attention");
  const query = useOverviewQuery();
  const relativeTime = useRelativeTime();
  const alerts = query.data?.data.alerts;

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={
          alerts ? t("summary", { total: alerts.openTotal, critical: alerts.critical }) : undefined
        }
        action={<CardLink href={routes.alerts}>{t("all")}</CardLink>}
      />
      <CardBody flush>
        <QueryState query={query} skeleton={<ListSkeleton rows={4} className="px-4.5 py-2" />}>
          {({ data }) =>
            data.alerts.top.length === 0 ? (
              <StateBlock icon={Check} title={t("emptyTitle")} description={t("emptyDescription")} />
            ) : (
              <ul>
                {data.alerts.top.map((alert) => (
                  <li key={alert.id} className="border-b last:border-b-0">
                    <ScopeLink href={routes[alertRoute(alert.code)]} className="hover:bg-surface-2 block">
                      <AlertItem alert={alert} age={relativeTime(alert.openedAt)} />
                    </ScopeLink>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryState>
      </CardBody>
    </Card>
  );
};
