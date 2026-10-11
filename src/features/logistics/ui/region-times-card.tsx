"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { useMetaQuery } from "@/shared/meta/use-meta-query";
import { BarList } from "@/shared/ui/bar-list";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useRegionDeliveryQuery } from "../hooks/use-logistics";
import { regionName } from "../model/logistics.rules";

/** Qaysi hududga yetkazish qancha vaqt oladi. Vaqtlar qo'shilmaydi — ulush ko'rsatilmaydi. */
export const RegionTimesCard = ({ className }: { className?: string }) => {
  const t = useTranslations("logistics.regions");
  const format = useFormat();
  const query = useRegionDeliveryQuery();
  const regions = useMetaQuery().data?.regions;

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={7} />}
          isEmpty={({ data }) => data.length === 0}
        >
          {({ data }) => (
            <BarList
              format={format.duration}
              showShare={false}
              // Yakunlangan buyurtmasi yo'q hudud (`avg_minutes: null`) ro'yxatga kirmaydi.
              items={data.flatMap((item) =>
                item.avgMinutes === null
                  ? []
                  : [{ key: item.region, label: regionName(item.region, regions), value: item.avgMinutes }],
              )}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
