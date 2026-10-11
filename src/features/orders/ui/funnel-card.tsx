"use client";

import { useTranslations } from "next-intl";

import { orderStatusStyle } from "@/shared/config/order-status";
import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Funnel } from "@/shared/ui/funnel";
import { BlockSkeleton, QueryState } from "@/shared/ui/states";

import { useOrdersFunnelQuery } from "../hooks/use-orders";
import { useOrderLabels } from "../hooks/use-order-labels";
import type { OrdersFunnel } from "../model/orders.schema";

/** Davrda yaratilgan buyurtmalar kogortasi: qayergacha yetdi, nechtasi atkaz va nechtasi hali yo'lda. */
export const FunnelCard = ({ className }: { className?: string }) => {
  const t = useTranslations("orders.funnel");
  const query = useOrdersFunnelQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<BlockSkeleton className="h-72" />}
          isEmpty={({ data }) => (data.stages[0]?.count ?? 0) === 0}
        >
          {({ data }) => <FunnelContent funnel={data} />}
        </QueryState>
      </CardBody>
    </Card>
  );
};

const FunnelContent = ({ funnel }: { funnel: OrdersFunnel }) => {
  const t = useTranslations("orders.funnel");
  const format = useFormat();
  const labels = useOrderLabels();

  const outcomes = [
    {
      key: "cancelled",
      label: t("cancelled"),
      share: funnel.cancelled,
      colorClassName: orderStatusStyle("cancelled").dot,
    },
    {
      key: "inProgress",
      label: t("inProgress"),
      share: funnel.inProgress,
      colorClassName: orderStatusStyle("pending").dot,
    },
  ];

  return (
    <>
      <Funnel
        steps={funnel.stages.map((stage) => ({
          key: stage.status,
          label: labels.first([`funnel.stages.${stage.status}`], stage.status),
          count: stage.count,
          secondary: format.money(stage.amount),
          // "created" buyurtma holati emas — neytral rang oladi.
          colorClassName: orderStatusStyle(stage.status).bar,
        }))}
        renderTransition={(percent) =>
          t.rich("transition", {
            percent,
            b: (chunks) => <b className="text-ink-2 font-semibold">{chunks}</b>,
          })
        }
      />
      <dl className="mt-4 grid grid-cols-2 gap-x-4 border-t pt-3.5">
        {outcomes.map((outcome) => (
          <div key={outcome.key} className="min-w-0">
            <dt className="text-ink-2 flex items-center gap-1.5 text-xs">
              <span aria-hidden className={cn("size-2.5 shrink-0 rounded-xs", outcome.colorClassName)} />
              <span className="truncate">{outcome.label}</span>
            </dt>
            <dd className="font-strong mt-0.5 text-lg tracking-tight whitespace-nowrap">
              {formatNumber(outcome.share.count)}
              <span className="num text-2xs text-ink-3 ml-1.5 font-medium tracking-normal">
                {formatPercent(outcome.share.pctOfCreated)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
};
