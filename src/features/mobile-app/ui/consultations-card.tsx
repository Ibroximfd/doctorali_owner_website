"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatDecimal, formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { KvList } from "@/shared/ui/kv-list";
import { MiniStats } from "@/shared/ui/mini-stats";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useAppConsultationsQuery } from "../hooks/use-mobile-app";
import { isConsultationsEmpty, shareOf } from "../model/mobile-app.rules";

const DASH = "—";

/** Ilovadagi shifokor qabuli: tushum, baho va yaratilgandan yakunlangangacha bo'lgan yo'l. */
export const ConsultationsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("mobileApp.consultations");
  const format = useFormat();
  const query = useAppConsultationsQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={5} />}
          isEmpty={({ data }) => isConsultationsEmpty(data)}
        >
          {({ data }) => (
            <>
              <MiniStats
                items={[
                  {
                    key: "revenue",
                    label: t("revenue"),
                    value: format.moneyCompact(data.revenue),
                    unit: format.currency,
                  },
                  {
                    key: "rating",
                    label: t("rating"),
                    value: data.avgRating === null ? DASH : formatDecimal(data.avgRating),
                    unit: data.avgRating === null ? undefined : t("ratingScale"),
                    note:
                      data.ratingCount === null
                        ? undefined
                        : t("ratingCount", { count: formatNumber(data.ratingCount) }),
                  },
                ]}
              />
              <KvList
                className="mt-2.5"
                rows={[
                  { key: "created", label: t("created"), value: formatNumber(data.created) },
                  {
                    key: "paid",
                    label: t("paid"),
                    value: formatNumber(data.paid),
                    hint: formatPercent(shareOf(data.paid, data.created)),
                  },
                  { key: "completed", label: t("completed"), value: formatNumber(data.completed) },
                  {
                    key: "cancelled",
                    label: t("cancelled"),
                    value: formatNumber(data.cancelled),
                    hint: formatPercent(shareOf(data.cancelled, data.created)),
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
