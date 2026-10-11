"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { orderStatusStyle } from "@/shared/config/order-status";
import { routes } from "@/shared/config/routes";
import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { CardLink } from "@/shared/ui/card-link";
import { StageBadge } from "@/shared/ui/stage-badge";
import { BlockSkeleton, QueryState } from "@/shared/ui/states";

import { useOverviewQuery } from "../hooks/use-overview";
import { isStaleStage } from "../model/overview.rules";

/** Hozir har bosqichda nechta buyurtma va qancha summa turibdi (davrga bog'liq emas). */
export const PipelineCard = ({ className }: { className?: string }) => {
  const t = useTranslations("overview.pipeline");
  const format = useFormat();
  const query = useOverviewQuery();

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={t("description")}
        action={<CardLink href={routes.orders}>{t("link")}</CardLink>}
      />
      <CardBody>
        <QueryState query={query} skeleton={<BlockSkeleton className="h-28" />}>
          {({ data }) => (
            <ol className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
              {data.pipelineNow.map((stage, index) => {
                const hasStale = isStaleStage(stage.status) && stage.staleCount > 0;
                return (
                  <li
                    key={stage.status}
                    className={cn(
                      "bg-surface-2 relative min-w-0 rounded-lg border p-3",
                      index === 0 && "max-md:col-span-2",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-3 top-0 h-0.75 rounded-b-sm",
                        orderStatusStyle(stage.status).bar,
                      )}
                    />
                    <StageBadge status={stage.status} className="text-ink-2 mt-1" />
                    <div className="font-strong mt-1.5 text-2xl leading-none tracking-tight">
                      {formatNumber(stage.count)}
                    </div>
                    <div className="num text-ink-3 mt-1 text-xs font-medium whitespace-nowrap">
                      {format.money(stage.amount)}
                    </div>
                    <div
                      className={cn(
                        "text-2xs mt-2 flex items-center gap-1 leading-tight",
                        hasStale ? "text-serious" : "text-ink-3",
                      )}
                    >
                      {hasStale && isStaleStage(stage.status) ? (
                        <>
                          <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
                          {t(`stale.${stage.status}`, { count: stage.staleCount })}
                        </>
                      ) : isStaleStage(stage.status) ? (
                        t("onTrack")
                      ) : (
                        t("today")
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
