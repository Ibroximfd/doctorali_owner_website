"use client";

import { useTranslations } from "next-intl";

import { formatNumber } from "@/shared/lib/format";
import { BarList } from "@/shared/ui/bar-list";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useAttemptReasonsQuery } from "../hooks/use-logistics";
import { isAttemptReason } from "../model/logistics.rules";

/** Kuryer bordi, lekin topshira olmadi — nima sababdan. */
export const AttemptReasonsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("logistics.reasons");
  const query = useAttemptReasonsQuery();
  const reasons = query.data?.data;
  const total = reasons?.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={total === undefined ? undefined : t("total", { count: formatNumber(total) })}
      />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={4} />}
          isEmpty={({ data }) => data.every((item) => item.count === 0)}
        >
          {({ data }) => (
            <BarList
              items={data.map((item) => ({
                key: item.reason,
                // yangi (tarjimasi yo'q) sabab — kodning o'zi bilan ko'rsatiladi
                label: isAttemptReason(item.reason) ? t(`items.${item.reason}`) : item.reason,
                value: item.count,
              }))}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
