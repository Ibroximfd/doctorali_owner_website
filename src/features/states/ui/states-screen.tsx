"use client";

import { Info, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { routes } from "@/shared/config/routes";
import { useFormat } from "@/shared/hooks/use-format";
import { AppError } from "@/shared/lib/app-error";
import { formatNumber } from "@/shared/lib/format";
import { Banner } from "@/shared/ui/banner";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Grid, span } from "@/shared/ui/grid";
import { MiniStats } from "@/shared/ui/mini-stats";
import { ScopeLink } from "@/shared/ui/scope-link";
import {
  ChartSkeleton,
  EmptyState,
  ErrorState,
  ForbiddenState,
  NoResults,
  StaleNote,
  StatRowSkeleton,
} from "@/shared/ui/states";

/** Namuna qiymatlar: galereya hech narsa so'ramaydi, holatlar qo'lda ko'rsatiladi. */
const SAMPLE = {
  query: "DA-99999",
  cachedAt: "2026-10-02T14:05:00+05:00",
  orders: 131,
  revenue: 48_100_000,
  delivered: 96,
  staleMinutes: 18,
} as const;

const SAMPLE_ERROR = new AppError("server");

type StateCardProps = { title: string; description: string; className: string; children: ReactNode };

const StateCard = ({ title, description, className, children }: StateCardProps) => (
  <Card className={className}>
    <CardHeader title={title} description={description} />
    <CardBody>{children}</CardBody>
  </Card>
);

/**
 * Holatlar galereyasi: har ma'lumot bloki ko'rsata olishi shart bo'lgan olti
 * holat, ilovadagi haqiqiy (`shared/ui/states`) komponentlar bilan. Dizayn
 * tekshiruvi uchun — faqat namuna rejimida ochiladi.
 */
export const StatesScreen = () => {
  const t = useTranslations("states");
  const format = useFormat();
  // Galereyadagi tugmalar hech narsani o'zgartirmaydi — bosilganda shuni aytadi.
  const demo = () => void toast(t("demoAction"));

  return (
    <Grid>
      <StateCard className={span.full} title={t("loading.title")} description={t("loading.description")}>
        <StatRowSkeleton />
        <ChartSkeleton className="h-40" />
      </StateCard>

      <StateCard className={span.half4} title={t("empty.title")} description={t("empty.description")}>
        <EmptyState
          title={t("empty.stateTitle")}
          description={t("empty.stateDescription")}
          action={
            <Button size="sm" onClick={demo}>
              {t("empty.action")}
            </Button>
          }
        />
      </StateCard>

      <StateCard className={span.half4} title={t("noResults.title")} description={t("noResults.description")}>
        <NoResults query={SAMPLE.query} onClear={demo} />
      </StateCard>

      <StateCard className={span.c4} title={t("error.title")} description={t("error.description")}>
        <ErrorState error={SAMPLE_ERROR} onRetry={demo} />
      </StateCard>

      <StateCard className={span.c6} title={t("offline.title")} description={t("offline.description")}>
        <div role="status">
          <Banner
            icon={WifiOff}
            action={
              <Button size="sm" onClick={demo}>
                {t("offline.reconnect")}
              </Button>
            }
          >
            {t.rich("offline.banner", {
              time: format.time(SAMPLE.cachedAt),
              b: (chunks) => <b className="text-ink font-semibold">{chunks}</b>,
            })}
          </Banner>
        </div>
        {/* keshdagi kontent ko'rinib turadi, lekin xiraroq */}
        <MiniStats
          className="mt-3 opacity-70"
          items={[
            { key: "orders", label: t("offline.orders"), value: formatNumber(SAMPLE.orders) },
            {
              key: "revenue",
              label: t("offline.revenue"),
              value: format.moneyCompact(SAMPLE.revenue),
              unit: format.currency,
            },
            { key: "delivered", label: t("offline.delivered"), value: formatNumber(SAMPLE.delivered) },
          ]}
        />
      </StateCard>

      <StateCard className={span.c6} title={t("stale.title")} description={t("stale.description")}>
        <StaleNote>{t("stale.note", { minutes: SAMPLE.staleMinutes })}</StaleNote>
        <ForbiddenState />
      </StateCard>

      <StateCard
        className={span.full}
        title={t("filterChange.title")}
        description={t("filterChange.description")}
      >
        <Banner
          icon={Info}
          action={
            <Button asChild size="sm">
              <ScopeLink href={routes.overview}>{t("filterChange.link")}</ScopeLink>
            </Button>
          }
        >
          {t("filterChange.note")}
        </Banner>
      </StateCard>
    </Grid>
  );
};
