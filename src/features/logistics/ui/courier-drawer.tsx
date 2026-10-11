"use client";

import { UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { seriesColor } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { toAppError } from "@/shared/lib/app-error";
import type { Envelope } from "@/shared/lib/envelope";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { ChartCard } from "@/shared/ui/chart-card";
import { Drawer, DrawerSection } from "@/shared/ui/drawer";
import { KvList } from "@/shared/ui/kv-list";
import { MiniStats } from "@/shared/ui/mini-stats";
import { BlockSkeleton, ChartSkeleton, ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useCourierDrawer } from "../hooks/use-courier-drawer";
import { useCourierQuery } from "../hooks/use-logistics";
import { unsettledDays } from "../model/logistics.rules";
import type { CourierDetail } from "../model/logistics.schema";

const DASH = "—";

/** Kuryer kartasi (`?courier=<id>`): davr bo'yicha natija, naqd pul holati va kunlik dinamika. Faqat ko'rish. */
export const CourierDrawer = () => {
  const t = useTranslations("logistics.drawer");
  const { courierId, closeCourier } = useCourierDrawer();
  // Yopilish animatsiyasi tugaguncha oxirgi ochilgan kuryer ko'rinib turadi — kontent skeletonga almashib "miltillamaydi".
  const [shownId, setShownId] = useState(courierId);
  if (courierId !== null && courierId !== shownId) setShownId(courierId);

  const query = useCourierQuery(shownId, courierId !== null);
  const courier = query.data?.data;
  // Eskirgan havola: «Qayta urinish» foyda bermaydi — tushuntiriladi.
  const isNotFound = courier === undefined && query.isError && toAppError(query.error).kind === "not-found";

  return (
    <Drawer
      open={courierId !== null}
      onOpenChange={(open) => {
        if (!open) closeCourier();
      }}
      title={courier?.fullName ?? t("title")}
      subtitle={
        courier ? (
          <span className="text-ink-3 text-xs">{t("role", { filial: courier.filial })}</span>
        ) : undefined
      }
    >
      {isNotFound ? (
        <StateBlock icon={UserX} title={t("notFoundTitle")} description={t("notFoundDescription")} />
      ) : (
        <QueryState
          query={query}
          className="flex flex-col gap-4.5"
          skeleton={
            <>
              <BlockSkeleton className="h-36" />
              <ListSkeleton rows={4} />
              <ChartSkeleton className="h-44" />
            </>
          }
        >
          {(envelope) => <CourierDetails envelope={envelope} />}
        </QueryState>
      )}
    </Drawer>
  );
};

const CourierDetails = ({ envelope }: { envelope: Envelope<CourierDetail> }) => {
  const t = useTranslations("logistics.drawer");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const { data: courier, period, generatedAt } = envelope;
  const oldestDays = unsettledDays(courier.oldestUnsettledAt, generatedAt);
  const oldestLabel =
    oldestDays === null ? DASH : oldestDays === 0 ? tCommon("today") : t("daysAgo", { count: oldestDays });

  return (
    <>
      <MiniStats
        items={[
          {
            key: "delivered",
            label: t("delivered"),
            value: formatNumber(courier.delivered),
            unit: `/ ${formatNumber(courier.assigned)}`,
          },
          { key: "successRate", label: t("successRate"), value: formatPercent(courier.successRate) },
          { key: "avgTime", label: t("avgTime"), value: format.duration(courier.avgMinutes) },
          {
            key: "codUnsettled",
            label: t("codUnsettled"),
            value: format.moneyCompact(courier.codUnsettled),
            unit: format.currency,
          },
        ]}
      />

      <DrawerSection title={t("cash")}>
        <KvList
          rows={[
            {
              key: "codCollected",
              label: t("codCollected"),
              value: format.moneyCompact(courier.codCollected),
              hint: format.currency,
            },
            {
              key: "unsettled",
              label: t("unsettled"),
              value: format.moneyCompact(courier.codUnsettled),
              hint: format.currency,
            },
            { key: "oldestUnsettled", label: t("oldestUnsettled"), value: oldestLabel },
            { key: "attempts", label: t("attempts"), value: formatNumber(courier.attempts) },
          ]}
        />
      </DrawerSection>

      <ChartCard
        kind="columns"
        title={t("daily")}
        columnLabel={tCommon("period")}
        formatValue={formatNumber}
        heightClassName="h-44"
        data={{
          labels: courier.timeseries.labels.map((label) => format.bucket(label, period.granularity)),
          series: courier.timeseries.series.map((series, index) => ({
            key: series.key,
            name: series.key === "delivered" ? t("deliveredSeries") : series.key,
            color: seriesColor(index),
            values: series.values,
          })),
        }}
      />
    </>
  );
};
