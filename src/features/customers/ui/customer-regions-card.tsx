"use client";

import { useTranslations } from "next-intl";

import { formatPercent } from "@/shared/lib/format";
import { BarList } from "@/shared/ui/bar-list";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useCustomerRegionsQuery, useRegionName } from "../hooks/use-customers";
import { TOP_REGIONS_LIMIT, topRegions } from "../model/customers.rules";

/** Mijozi eng ko'p hududlar. Ulush — barcha hududlar jamiga nisbatan. */
export const CustomerRegionsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("customers.regions");
  const regionName = useRegionName();
  const query = useCustomerRegionsQuery();
  const regions = query.data?.data;

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={
          regions ? t("description", { count: Math.min(TOP_REGIONS_LIMIT, regions.length) }) : undefined
        }
      />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={TOP_REGIONS_LIMIT} />}
          isEmpty={({ data }) => data.length === 0}
        >
          {({ data }) => (
            <BarList
              showShare={false}
              items={topRegions(data).map((region) => ({
                key: region.region,
                label: regionName(region.region),
                value: region.customers,
                extra: formatPercent(region.sharePct),
              }))}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
