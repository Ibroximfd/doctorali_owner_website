"use client";

import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { routes } from "@/shared/config/routes";
import { ALERT_SEVERITIES, alertCategory, alertRoute, type Alert } from "@/shared/domain/alert";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { AlertItem } from "@/shared/ui/alert-item";
import { Button } from "@/shared/ui/button";
import { Card, CardHeader } from "@/shared/ui/card";
import { Chip } from "@/shared/ui/chip";
import { Pill } from "@/shared/ui/pill";
import { ScopeLink } from "@/shared/ui/scope-link";
import { ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useAcknowledgeAlert } from "../hooks/use-acknowledge-alert";
import { useCategoryLabel } from "../hooks/use-alert-labels";
import { useAlertsQuery } from "../hooks/use-alerts-query";
import { useSeverityFilter } from "../hooks/use-severity-filter";
import { splitAlerts } from "../model/alerts.rules";

/** Ochiq signallar (daraja filtri bilan) va pastda — ko'rilganlar. */
export const AlertListCard = ({ className }: { className?: string }) => {
  const t = useTranslations("alerts");
  const tCommon = useTranslations("common");
  const tSeverity = useTranslations("common.severity");
  const query = useAlertsQuery();
  const [severity, setSeverity] = useSeverityFilter();

  return (
    <Card className={className} aria-label={t("list.label")}>
      <QueryState query={query} skeleton={<ListSkeleton rows={6} className="p-3.5 md:p-4.5" />}>
        {({ counts, results }) => {
          const { open, visible, acknowledged } = splitAlerts(results, severity);

          return (
            <>
              <div
                role="group"
                aria-label={t("filter.label")}
                className="flex flex-wrap gap-2 px-3.5 pt-3.5 md:px-4.5 md:pt-4"
              >
                <Chip pressed={severity === null} count={counts.open} onClick={() => void setSeverity(null)}>
                  {tCommon("all")}
                </Chip>
                {ALERT_SEVERITIES.map((level) => (
                  <Chip
                    key={level}
                    pressed={severity === level}
                    count={counts[level]}
                    onClick={() => void setSeverity(level)}
                  >
                    {tSeverity(level)}
                  </Chip>
                ))}
              </div>

              {visible.length > 0 ? (
                <ul className="mt-2">
                  {visible.map((alert) => (
                    <li key={alert.id} className="border-b last:border-b-0">
                      <OpenAlert alert={alert} />
                    </li>
                  ))}
                </ul>
              ) : open.length > 0 ? (
                <StateBlock
                  icon={Check}
                  title={t("list.noneTitle")}
                  description={t("list.noneDescription")}
                  action={
                    <Button size="sm" onClick={() => void setSeverity(null)}>
                      {t("list.showAll")}
                    </Button>
                  }
                />
              ) : (
                <StateBlock
                  icon={Check}
                  title={t("list.emptyTitle")}
                  description={t("list.emptyDescription")}
                />
              )}

              {acknowledged.length > 0 ? <AcknowledgedAlerts alerts={acknowledged} /> : null}
            </>
          );
        }}
      </QueryState>
    </Card>
  );
};

/** Ochiq signal: tegishli bo'limga havola, "ko'rildi" va toifa belgisi. */
const OpenAlert = ({ alert }: { alert: Alert }) => {
  const t = useTranslations("alerts.list");
  const tCommon = useTranslations("common");
  const relativeTime = useRelativeTime();
  const categoryLabel = useCategoryLabel();
  const acknowledge = useAcknowledgeAlert();
  const route = alertRoute(alert.code);
  // Muvaffaqiyatdan keyin ham band: ro'yxat yangilanguncha ikkinchi marta bosilmasin.
  const isSettling = acknowledge.isPending || acknowledge.isSuccess;

  return (
    <AlertItem
      alert={alert}
      age={relativeTime(alert.openedAt)}
      actions={
        <>
          {/* Noma'lum toifaning bo'limi yo'q — o'ziga olib boruvchi havola ko'rsatilmaydi. */}
          {route === "alerts" ? null : (
            <Button asChild size="sm">
              <ScopeLink href={routes[route]} aria-label={t("viewLabel", { title: alert.title })}>
                {t("view")}
                <ArrowRight aria-hidden />
              </ScopeLink>
            </Button>
          )}
          <Button
            size="sm"
            intent="ghost"
            disabled={isSettling}
            aria-label={t("ackLabel", { title: alert.title })}
            onClick={() =>
              acknowledge.mutate(alert.id, { onError: () => toast.error(tCommon("saveFailed")) })
            }
          >
            <Check aria-hidden />
            {t("ack")}
          </Button>
          <Pill>{categoryLabel(alertCategory(alert.code))}</Pill>
        </>
      }
    />
  );
};

/** Ko'rilgan signallar: alohida sarlavha ostida, amallarsiz (shaffoflik yo'q — matn kontrasti saqlanadi) — sabab yo'qolgach tizim o'zi yopadi. */
const AcknowledgedAlerts = ({ alerts }: { alerts: readonly Alert[] }) => {
  const t = useTranslations("alerts.acknowledged");
  const relativeTime = useRelativeTime();

  return (
    <div className="mt-1.5 border-t">
      <CardHeader title={t("title")} description={t("description", { count: alerts.length })} />
      <ul className="mt-2">
        {alerts.map((alert) => (
          <li key={alert.id} className="border-b last:border-b-0">
            <AlertItem alert={alert} age={relativeTime(alert.openedAt)} />
          </li>
        ))}
      </ul>
    </div>
  );
};
