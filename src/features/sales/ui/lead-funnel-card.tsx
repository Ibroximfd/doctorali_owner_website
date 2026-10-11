"use client";

import { useTranslations } from "next-intl";

import { formatPercent } from "@/shared/lib/format";
import { BarList } from "@/shared/ui/bar-list";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useLeadsFunnelQuery } from "../hooks/use-sales";
import { leadKindBarClass } from "../model/sales.rules";

/**
 * Davrda kelgan lidlar hozir qaysi statusda. Status nomlari CRM dan keladi
 * (tarjima qilinmaydi); rang — status turi: jarayonda / buyurtma / rad.
 */
export const LeadFunnelCard = ({ className }: { className?: string }) => {
  const t = useTranslations("sales.funnel");
  const query = useLeadsFunnelQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={5} />}
          isEmpty={({ data }) => data.length === 0}
        >
          {({ data }) => (
            <BarList
              showShare={false}
              items={data.map((status) => ({
                key: String(status.statusId),
                label: status.name,
                value: status.count,
                extra: formatPercent(status.sharePct),
                barClassName: leadKindBarClass(status.kind),
              }))}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
