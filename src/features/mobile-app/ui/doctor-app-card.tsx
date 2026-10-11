"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Banner } from "@/shared/ui/banner";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { MiniStats } from "@/shared/ui/mini-stats";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useDoctorAppQuery } from "../hooks/use-mobile-app";
import { isDoctorAppEmpty } from "../model/mobile-app.rules";

/** «Doctor Ali Pro» — shifokorlar ilovasi. Do'kon ko'rsatkichlari (reyting, yuklab olish) 2-bosqichda. */
export const DoctorAppCard = ({ className }: { className?: string }) => {
  const t = useTranslations("mobileApp.doctorApp");
  const format = useFormat();
  const query = useDoctorAppQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={3} />}
          isEmpty={({ data }) => isDoctorAppEmpty(data)}
        >
          {({ data }) => (
            <MiniStats
              items={[
                { key: "doctors", label: t("activeDoctors"), value: formatNumber(data.activeDoctors) },
                {
                  key: "orders",
                  label: t("ordersCreated"),
                  value: formatNumber(data.ordersCreated),
                  note: format.money(data.ordersAmount),
                },
              ]}
            />
          )}
        </QueryState>
        {/* Izoh ma'lumotga bog'liq emas — so'rov xato bo'lsa ham ko'rinadi. */}
        <Banner icon={Info} className="mt-3">
          {t.rich("storesNote", { b: (chunks) => <b className="text-ink font-semibold">{chunks}</b> })}
        </Banner>
      </CardBody>
    </Card>
  );
};
