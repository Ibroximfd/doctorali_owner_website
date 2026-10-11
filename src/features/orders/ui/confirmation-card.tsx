"use client";

import { useTranslations } from "next-intl";

import { seriesBg } from "@/shared/config/chart-palette";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { StackedBar } from "@/shared/ui/stacked-bar";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useOrdersBreakdownQuery } from "../hooks/use-orders";
import { useOrderLabels } from "../hooks/use-order-labels";
import { confirmationColorIndex, hasNoCounts } from "../model/orders.rules";

/** Tasdiqlangan buyurtmalar qaysi kanal orqali tasdiqlandi (butunning qismlari). */
export const ConfirmationCard = ({ className }: { className?: string }) => {
  const t = useTranslations("orders.confirmation");
  const labels = useOrderLabels();
  const query = useOrdersBreakdownQuery("confirmation_channel");

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
            <StackedBar
              legend="column"
              ariaLabel={t("title")}
              format={formatNumber}
              items={data.map((row, index) => ({
                key: row.key,
                label: labels.confirmationChannel(row.key, row.label),
                value: row.count,
                colorClassName: seriesBg(confirmationColorIndex(row.key, index)),
              }))}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
