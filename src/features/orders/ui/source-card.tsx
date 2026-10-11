"use client";

import { useTranslations } from "next-intl";

import { BarList } from "@/shared/ui/bar-list";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useOrdersBreakdownQuery } from "../hooks/use-orders";
import { useOrderLabels } from "../hooks/use-order-labels";
import { hasNoCounts } from "../model/orders.rules";

/** Buyurtmani kim yaratdi: operator, mijoz ilovasi, shifokor, registratura … */
export const SourceCard = ({ className }: { className?: string }) => {
  const t = useTranslations("orders.source");
  const labels = useOrderLabels();
  const query = useOrdersBreakdownQuery("source");

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={5} />}
          isEmpty={({ data }) => hasNoCounts(data)}
        >
          {({ data }) => (
            <BarList
              items={data.map((row) => ({
                key: row.key,
                label: labels.source(row.key, row.label),
                value: row.count,
              }))}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
