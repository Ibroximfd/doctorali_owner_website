"use client";

import { useTranslations } from "next-intl";
import { Fragment } from "react";

import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { RegionTiles } from "@/shared/ui/region-tiles";
import { BlockSkeleton, QueryState } from "@/shared/ui/states";

import { useOrdersBreakdownQuery } from "../hooks/use-orders";
import { useOrderLabels } from "../hooks/use-order-labels";
import { hasNoCounts, topRows } from "../model/orders.rules";

const TOP_REGIONS = 3;

/** 14 viloyat bo'yicha buyurtmalar soni + eng ko'p buyurtma kelgan uchtasi matn bilan. */
export const RegionsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("orders.regionsCard");
  const tScale = useTranslations("common.scale");
  const labels = useOrderLabels();
  const query = useOrdersBreakdownQuery("region");

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<BlockSkeleton className="h-56" />}
          isEmpty={({ data }) => hasNoCounts(data)}
        >
          {({ data }) => (
            <>
              <RegionTiles
                lowLabel={tScale("low")}
                highLabel={tScale("high")}
                regions={data.map((row) => ({
                  code: row.key,
                  name: labels.region(row.key, row.label),
                  value: row.count,
                  valueLabel: formatNumber(row.count),
                  detail: t("share", { share: formatPercent(row.sharePct) }),
                }))}
              />
              <p className="text-ink-3 mt-3 text-xs leading-relaxed">
                {t("top")}{" "}
                {topRows(data, TOP_REGIONS).map((row, index) => (
                  <Fragment key={row.key}>
                    {index > 0 ? " · " : null}
                    {labels.region(row.key, row.label)} —{" "}
                    <b className="num text-ink font-semibold">{formatNumber(row.count)}</b>
                  </Fragment>
                ))}
              </p>
            </>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
