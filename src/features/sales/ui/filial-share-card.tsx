"use client";

import { useTranslations } from "next-intl";

import { seriesBg } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { useMetaQuery } from "@/shared/meta/use-meta-query";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { StackedBar } from "@/shared/ui/stacked-bar";
import { ListSkeleton, QueryState } from "@/shared/ui/states";
import { metricAmount } from "@/shared/lib/envelope";

import { useSalesFilialsQuery } from "../hooks/use-sales";
import { filialColorIndex, rankFilials } from "../model/sales.rules";

/** Operatorlar sotuvida har filialning ulushi (ranglar dinamika grafigidagi bilan bir xil). */
export const FilialShareCard = ({ className }: { className?: string }) => {
  const t = useTranslations("sales.filialShare");
  const format = useFormat();
  const query = useSalesFilialsQuery();
  const metaFilials = useMetaQuery().data?.filials ?? [];

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={3} />}
          isEmpty={({ data }) => data.length === 0}
        >
          {({ data }) => (
            <StackedBar
              legend="column"
              ariaLabel={t("title")}
              format={format.moneyCompact}
              items={rankFilials(data).map((filial) => ({
                key: String(filial.id),
                label: filial.name,
                value: metricAmount(filial.salesAmount),
                colorClassName: seriesBg(
                  filialColorIndex(metaFilials.length > 0 ? metaFilials : data, filial.id),
                ),
              }))}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
