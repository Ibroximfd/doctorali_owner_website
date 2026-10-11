"use client";

import { useTranslations } from "next-intl";

import { seriesColor } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import type { Envelope } from "@/shared/lib/envelope";
import { formatDecimal, formatNumber, formatPercent } from "@/shared/lib/format";
import { ChartCard } from "@/shared/ui/chart-card";
import { Drawer, DrawerSection } from "@/shared/ui/drawer";
import { KvList } from "@/shared/ui/kv-list";
import { MiniStats } from "@/shared/ui/mini-stats";
import { Pill } from "@/shared/ui/pill";
import { BlockSkeleton, ChartSkeleton, ListSkeleton, QueryState } from "@/shared/ui/states";

import { useOperatorDrawer } from "../hooks/use-operator-drawer";
import { useOperatorQuery } from "../hooks/use-sales";
import type { OperatorDetail } from "../model/sales.schema";

const DASH = "—";

/** Operator kartasi (`?operator=<id>`). Sahifada bir marta o'rnatiladi. */
export const OperatorDrawer = () => {
  const { operatorId, closeOperator } = useOperatorDrawer();
  if (operatorId === null) return null;

  // `key` — boshqa operatorga o'tilganda oldingisining raqamlari ko'rinib qolmasin
  return <OperatorPanel key={operatorId} id={operatorId} onClose={closeOperator} />;
};

const OperatorPanel = ({ id, onClose }: { id: number; onClose: () => void }) => {
  const t = useTranslations("sales");
  const query = useOperatorQuery(id);
  const operator = query.data?.data;

  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={operator?.fullName ?? t("drawer.fallbackTitle")}
      subtitle={
        operator ? (
          <span className="text-ink-3 text-xs">
            {[t("drawer.role"), operator.filial].filter(Boolean).join(" · ")}
          </span>
        ) : undefined
      }
    >
      <QueryState query={query} skeleton={<OperatorSkeleton />}>
        {(envelope) => <OperatorContent envelope={envelope} />}
      </QueryState>
    </Drawer>
  );
};

const OperatorSkeleton = () => (
  <div className="flex flex-col gap-4.5">
    <BlockSkeleton className="h-36" />
    <ListSkeleton rows={5} />
    <ChartSkeleton className="h-44" />
  </div>
);

const OperatorContent = ({
  envelope: { period, data: operator },
}: {
  envelope: Envelope<OperatorDetail>;
}) => {
  const t = useTranslations("sales");
  const tCommon = useTranslations("common");
  const format = useFormat();

  return (
    <div className="flex flex-col gap-4.5">
      <MiniStats
        items={[
          {
            key: "sales",
            label: t("drawer.sales"),
            value: format.moneyCompact(operator.salesAmount),
            unit: format.currency,
          },
          { key: "conversion", label: t("drawer.conversion"), value: formatPercent(operator.conversionPct) },
          { key: "delivered", label: t("drawer.delivered"), value: formatNumber(operator.ordersDelivered) },
          {
            key: "rating",
            label: t("drawer.rating"),
            value: operator.ratingAvg === null ? DASH : formatDecimal(operator.ratingAvg),
            unit: operator.ratingAvg === null ? undefined : t("drawer.outOfFive"),
          },
        ]}
      />

      <DrawerSection title={t("drawer.work")}>
        <KvList
          rows={[
            { key: "leads", label: t("drawer.leads"), value: formatNumber(operator.leads) },
            {
              key: "commission",
              label: t("drawer.commission"),
              value: format.moneyCompact(operator.commissionEarned),
              hint: format.currency,
            },
            { key: "missed", label: t("drawer.missed"), value: formatNumber(operator.missedUnhandled) },
            { key: "overdue", label: t("drawer.overdue"), value: formatNumber(operator.activitiesOverdue) },
            {
              key: "state",
              label: t("drawer.state"),
              value: (
                <Pill intent={operator.isOnline ? "good" : "neutral"}>
                  {t(operator.isOnline ? "status.online" : "status.offline")}
                </Pill>
              ),
            },
          ]}
        />
      </DrawerSection>

      <ChartCard
        kind="columns"
        title={t("drawer.daily")}
        description={t("drawer.dailySeries")}
        columnLabel={tCommon("period")}
        formatValue={formatNumber}
        heightClassName="h-44"
        data={{
          labels: operator.trend.labels.map((label) => format.bucket(label, period.granularity)),
          series: operator.trend.series.map((series, index) => ({
            key: series.key,
            name: t("drawer.dailySeries"),
            color: seriesColor(index),
            values: series.values,
          })),
        }}
      />
    </div>
  );
};
