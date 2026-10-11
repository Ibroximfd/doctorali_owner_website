"use client";

import { useTranslations } from "next-intl";

import { ORDER_STATUS_STYLE } from "@/shared/config/order-status";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { MiniStats } from "@/shared/ui/mini-stats";
import { StackedBar } from "@/shared/ui/stacked-bar";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useClinicSummaryQuery } from "../hooks/use-clinic";

/** Yozilgan tashriflar nima bilan tugadi (keldi / kelmadi / bekor) va kelganlar kim: yangi yoki qaytgan. */
export const VisitsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("clinic.visits");
  const query = useClinicSummaryQuery();
  const visits = query.data?.data.visits;

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={visits ? t("scheduled", { count: formatNumber(visits.scheduled) }) : undefined}
      />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={4} />}
          isEmpty={({ data }) => data.visits.scheduled === 0}
        >
          {({ data: summary }) => (
            <>
              {/* Holat ranglari ma'nosi bo'yicha: keldi — yakunlangan, kelmadi — kutilgan, bekor — atkaz. */}
              <StackedBar
                legend="column"
                ariaLabel={t("barLabel")}
                items={[
                  {
                    key: "arrived",
                    label: t("arrived"),
                    value: summary.visits.arrived,
                    colorClassName: ORDER_STATUS_STYLE.delivered.bar,
                  },
                  {
                    key: "noShow",
                    label: t("noShow"),
                    value: summary.visits.noShow,
                    colorClassName: ORDER_STATUS_STYLE.pending.bar,
                  },
                  {
                    key: "cancelled",
                    label: t("cancelled"),
                    value: summary.visits.cancelled,
                    colorClassName: ORDER_STATUS_STYLE.cancelled.bar,
                  },
                ]}
              />
              <MiniStats
                className="mt-3"
                items={[
                  { key: "new", label: t("newClients"), value: formatNumber(summary.newClients.value) },
                  {
                    key: "returning",
                    label: t("returningClients"),
                    value: formatNumber(summary.returningClients.value),
                  },
                ]}
              />
            </>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
