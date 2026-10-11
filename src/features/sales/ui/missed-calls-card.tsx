"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { BarList } from "@/shared/ui/bar-list";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useOperatorsQuery } from "../hooks/use-sales";
import { operatorsWithMissedCalls } from "../model/sales.rules";

/** Hozir qayta qo'ng'iroq kutayotgan o'tkazib yuborilganlar — operator bo'yicha. */
export const MissedCallsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("sales.missed");
  const query = useOperatorsQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={6} />}
          isEmpty={({ data }) => data.length === 0}
        >
          {({ data }) => {
            const operators = operatorsWithMissedCalls(data);
            if (operators.length === 0) {
              return <StateBlock icon={Check} title={t("emptyTitle")} description={t("emptyDescription")} />;
            }
            return (
              <BarList
                showShare={false}
                barClassName="bg-order-cancelled"
                items={operators.map((operator) => ({
                  key: String(operator.id),
                  label: operator.fullName,
                  value: operator.missedUnhandled,
                }))}
              />
            );
          }}
        </QueryState>
      </CardBody>
    </Card>
  );
};
