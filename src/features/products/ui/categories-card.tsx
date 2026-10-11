"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { BarList } from "@/shared/ui/bar-list";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useProductsQuery } from "../hooks/use-products";
import { sortCategories } from "../model/products.rules";

/** Toifalar bo'yicha mahsulot tushumi (nominal toifalar — bitta rangda). */
export const CategoriesCard = ({ className }: { className?: string }) => {
  const t = useTranslations("products.categories");
  const format = useFormat();
  const query = useProductsQuery();
  const summary = query.data?.data.summary;

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={summary ? t("description", { total: format.money(summary.revenue.value) }) : undefined}
      />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={7} />}
          isEmpty={({ data }) => data.categories.length === 0}
        >
          {({ data }) => (
            <BarList
              format={format.moneyCompact}
              items={sortCategories(data.categories).map((category) => ({
                key: category.name,
                label: category.name,
                value: category.revenue,
              }))}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
