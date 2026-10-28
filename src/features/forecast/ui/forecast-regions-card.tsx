"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatPercent } from "@/shared/lib/format";
import { useRegionName } from "@/shared/meta/use-region-name";
import { BarList } from "@/shared/ui/bar-list";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useForecastRegionsQuery } from "../hooks/use-forecast";

/** Qaysi hudud qancha olib keladi (kutilgan tushum) va o'sishi. */
export const ForecastRegionsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("forecast.regions");
  const format = useFormat();
  const regionName = useRegionName();
  const query = useForecastRegionsQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={6} />}
          isEmpty={({ data }) => data.length === 0}
        >
          {({ data }) => (
            <BarList
              format={format.moneyCompact}
              barClassName="bg-gold"
              items={[...data]
                .sort((a, b) => b.expectedRevenue - a.expectedRevenue)
                .map((row) => ({
                  key: row.region,
                  label: regionName(row.region),
                  value: row.expectedRevenue,
                  extra:
                    row.growthPct === null ? undefined : (
                      <span className={row.growthPct >= 0 ? "text-good" : "text-crit"}>
                        {row.growthPct >= 0 ? "+" : ""}
                        {formatPercent(row.growthPct)}
                      </span>
                    ),
                }))}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
