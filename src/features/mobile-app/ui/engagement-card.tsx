"use client";

import { useTranslations } from "next-intl";

import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { KvList } from "@/shared/ui/kv-list";
import { MetricDelta } from "@/shared/ui/metric-delta";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useAppEngagementQuery } from "../hooks/use-mobile-app";
import { ENGAGEMENT_KEYS, isEngagementEmpty } from "../model/mobile-app.rules";

/** Ilova imkoniyatlaridan foydalanish. Hali yig'ilmayotgan ko'rsatkich "ma'lumot yo'q" deb chiqadi. */
export const EngagementCard = ({ className }: { className?: string }) => {
  const t = useTranslations("mobileApp.engagement");
  const tApp = useTranslations("mobileApp");
  const query = useAppEngagementQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={6} />}
          isEmpty={({ data }) => isEngagementEmpty(data)}
        >
          {({ data }) => (
            <KvList
              rows={ENGAGEMENT_KEYS.map((key) => {
                const metric = data[key];
                return {
                  key,
                  label: t(`items.${key}`),
                  value:
                    metric === null ? (
                      <span className="text-ink-3 font-medium">{tApp("noData")}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        {formatNumber(metric.value)}
                        <MetricDelta value={metric.deltaPct} />
                      </span>
                    ),
                };
              })}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
