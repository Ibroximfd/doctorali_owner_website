"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { BarList } from "@/shared/ui/bar-list";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useExpensesQuery } from "../hooks/use-finance";
import { useExpenseCategoryLabel } from "../hooks/use-finance-labels";

/** Xarajatlar toifalar bo'yicha — nominal ro'yxat, bitta rangda. */
export const ExpensesCard = ({ className }: { className?: string }) => {
  const t = useTranslations("finance.expenses");
  const format = useFormat();
  const categoryLabel = useExpenseCategoryLabel();
  const query = useExpensesQuery();
  const total = query.data?.data.total.value;

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={total === undefined ? undefined : t("total", { value: format.money(total) })}
      />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={7} />}
          isEmpty={({ data }) => data.byCategory.every((row) => row.amount <= 0)}
        >
          {({ data }) => (
            <BarList
              format={format.moneyCompact}
              items={data.byCategory.map((row) => ({
                key: row.category,
                label: categoryLabel(row.category),
                value: row.amount,
              }))}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
