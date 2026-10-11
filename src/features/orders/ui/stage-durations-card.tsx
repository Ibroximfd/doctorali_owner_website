"use client";

import { Check, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Meter } from "@/shared/ui/meter";
import { Pill } from "@/shared/ui/pill";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useStageDurationsQuery } from "../hooks/use-orders";
import { useOrderLabels } from "../hooks/use-order-labels";
import { stageMeter } from "../model/orders.rules";
import type { StageDuration } from "../model/orders.schema";

/** Har bosqich qancha vaqt oladi: mediana, maqsad va oldingi davr. */
export const StageDurationsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("orders.stageDurations");
  const query = useStageDurationsQuery();

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
            <ul className="flex flex-col">
              {data.map((stage) => (
                <StageRow key={stage.stage} stage={stage} />
              ))}
            </ul>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};

const StageRow = ({ stage }: { stage: StageDuration }) => {
  const t = useTranslations("orders.stageDurations");
  const format = useFormat();
  const labels = useOrderLabels();
  const name = labels.stage(stage.stage);
  const target = format.duration(stage.targetMin);

  // Davrda bu bosqichdan o'tgan buyurtma yo'q — vaqt «—», baho va o'lchagich chizilmaydi.
  if (stage.p50Min === null)
    return (
      <li className="border-b py-2.5 first:pt-0 last:border-b-0 last:pb-0">
        <span className="font-mid min-w-0 truncate text-sm">{name}</span>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <b className="font-strong text-ink-3 text-xl tracking-tight">—</b>
          <span className="text-ink-3 text-xs">{t("target", { value: target })}</span>
        </div>
      </li>
    );

  const meter = stageMeter(stage.p50Min, stage.targetMin);
  const value = format.duration(stage.p50Min);

  return (
    <li className="border-b py-2.5 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mid min-w-0 truncate text-sm">{name}</span>
        <Pill intent={meter.isOver ? "warn" : "good"} icon={meter.isOver ? TriangleAlert : Check}>
          {t(meter.isOver ? "slow" : "onTarget")}
        </Pill>
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <b className="font-strong text-xl tracking-tight whitespace-nowrap">{value}</b>
        <span className="text-ink-3 text-xs">
          {t("target", { value: target })}
          {stage.previousP50Min === null
            ? null
            : ` · ${t("previous", { value: format.duration(stage.previousP50Min) })}`}
        </span>
      </div>
      <Meter
        className="mt-2.5"
        value={meter.value}
        marker={meter.marker}
        tone={meter.isOver ? "warn" : "accent"}
        ariaLabel={t("meterLabel", { stage: name, value, target })}
      />
    </li>
  );
};
