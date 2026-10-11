"use client";

import { useTranslations } from "next-intl";

import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Heatmap } from "@/shared/ui/heatmap";
import { BlockSkeleton, QueryState } from "@/shared/ui/states";

import { useOrdersHeatmapQuery } from "../hooks/use-orders";
import { bucketLabels, bucketRange, hasNoCounts, heatmapGrid } from "../model/orders.rules";

/** Buyurtmalar qachon ko'p yaratiladi: hafta kuni × 2 soatlik oraliq. */
export const OrdersHeatmapCard = ({ className }: { className?: string }) => {
  const t = useTranslations("orders.heatmap");
  const tScale = useTranslations("common.scale");
  const query = useOrdersHeatmapQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<BlockSkeleton className="h-52" />}
          isEmpty={({ data }) => hasNoCounts(data)}
        >
          {({ data }) => (
            <Heatmap
              columnLabels={bucketLabels()}
              lowLabel={tScale("low")}
              highLabel={tScale("high")}
              rows={heatmapGrid(data).map((row) => ({
                key: row.weekday,
                label: t(`weekdaysShort.${row.weekday}`),
                cells: row.buckets.map((count, bucket) => ({
                  key: `${row.weekday}-${bucket}`,
                  value: count,
                  title: `${t(`weekdays.${row.weekday}`)} ${bucketRange(bucket)}`,
                  valueLabel: t("cellValue", { count: formatNumber(count) }),
                })),
              }))}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
