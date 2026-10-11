"use client";

import { useTranslations } from "next-intl";

import { seriesBg } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { StackedBar } from "@/shared/ui/stacked-bar";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { usePaymentMixQuery } from "../hooks/use-finance";
import { usePaymentMethodLabel } from "../hooks/use-finance-labels";
import { paymentColorIndex } from "../model/finance.rules";

/** Tushum qaysi yo'l bilan to'landi: naqd, Click, Payme, karta, terminal. */
export const PaymentMixCard = ({ className }: { className?: string }) => {
  const t = useTranslations("finance.paymentMix");
  const format = useFormat();
  const methodLabel = usePaymentMethodLabel();
  const query = usePaymentMixQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={5} />}
          isEmpty={({ data }) => data.every((row) => row.amount <= 0)}
        >
          {({ data }) => (
            <StackedBar
              legend="column"
              ariaLabel={t("title")}
              format={format.moneyCompact}
              items={data.map((row, index) => ({
                key: row.method,
                label: methodLabel(row.method),
                value: row.amount,
                colorClassName: seriesBg(paymentColorIndex(row.method, index)),
              }))}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
