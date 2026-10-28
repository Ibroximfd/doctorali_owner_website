"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { pointChange } from "@/shared/lib/envelope";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { MetricDelta } from "@/shared/ui/metric-delta";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { QueryState, StatRowSkeleton } from "@/shared/ui/states";

import { useOverviewQuery } from "../hooks/use-overview";

/** Asosiy ko'rsatkichlar — «instrument» panellari: katta raqam, o'zgarish va kunlik ustunlar. */
export const OverviewKpis = () => {
  const t = useTranslations("overview.kpi");
  const format = useFormat();
  const query = useOverviewQuery();

  return (
    <QueryState query={query} skeleton={<StatRowSkeleton />}>
      {({ data: { kpis, sparklines } }) => (
        <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 xl:grid-cols-6">
          {[
            {
              key: "orders",
              label: t("orders"),
              value: formatNumber(kpis.orders.value),
              delta: kpis.orders.deltaPct,
              bars: sparklines.orders,
              tone: "bg-accent/55",
            },
            {
              key: "deliveryRate",
              label: t("deliveryRate"),
              value: formatPercent(kpis.deliveryRate.value),
              delta: pointChange(kpis.deliveryRate),
              deltaUnit: "pp" as const,
              bars: sparklines.deliveryRate,
              tone: "bg-accent/45",
            },
            {
              key: "avgCheck",
              label: t("avgCheck"),
              value: formatNumber(kpis.avgCheck.value),
              unit: format.currency,
              delta: kpis.avgCheck.deltaPct,
              bars: sparklines.avgCheck,
              tone: "bg-gold/55",
            },
            {
              key: "clinicVisits",
              label: t("clinicVisits"),
              value: formatNumber(kpis.clinicVisits.value),
              delta: kpis.clinicVisits.deltaPct,
              bars: sparklines.clinicVisits,
              tone: "bg-gold/45",
            },
            {
              key: "newCustomers",
              label: t("newCustomers"),
              value: formatNumber(kpis.newCustomers.value),
              delta: kpis.newCustomers.deltaPct,
              bars: sparklines.newCustomers,
              tone: "bg-info/50",
            },
            {
              key: "appActive",
              label: t("appActive"),
              value: formatNumber(kpis.appActiveUsers.value),
              delta: kpis.appActiveUsers.deltaPct,
              bars: sparklines.appActiveUsers,
              tone: "bg-info/40",
            },
          ].map(({ key, ...tile }, index) => (
            <InstrumentTile key={key} index={index} {...tile} />
          ))}
        </div>
      )}
    </QueryState>
  );
};

type InstrumentTileProps = {
  label: string;
  value: string;
  unit?: string;
  delta: number | null | undefined;
  deltaUnit?: "pct" | "pp";
  bars: readonly number[] | undefined;
  /** Ustunlar rangi (token klassi); oxirgi — bugungi — ustun yorqin. */
  tone: string;
  index: number;
};

/** Bitta instrument: yorliq, raqam, o'zgarish, ostida davr bo'yicha ustunlar (oxirgisi — bugun). */
export const InstrumentTile = ({
  label,
  value,
  unit,
  delta,
  deltaUnit,
  bars,
  tone,
  index,
}: InstrumentTileProps) => {
  const reduce = useReducedMotion();
  const values = bars ?? [];
  const max = Math.max(0, ...values);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.7, delay: reduce ? 0 : index * 0.07, ease: EASE_OUT }}
      className="panel-surface relative flex min-w-0 flex-col overflow-hidden rounded-3xl border px-4 pt-3.5 pb-3"
    >
      <div className="text-ink-2 truncate text-xs font-medium">{label}</div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        <span className="num text-2xl leading-none font-semibold tracking-tight whitespace-nowrap md:text-3xl">
          {value}
        </span>
        {unit ? <span className="text-ink-3 text-xs">{unit}</span> : null}
        <MetricDelta value={delta} unit={deltaUnit} className="ml-auto" />
      </div>
      {values.length > 1 && max > 0 ? (
        <div aria-hidden className="mt-3.5 flex h-14 items-end gap-0.5">
          {values.map((point, barIndex) => (
            <motion.span
              key={barIndex}
              className={cn(
                "min-h-px flex-1 origin-bottom rounded-t-xs",
                barIndex === values.length - 1 ? "bg-ink" : tone,
              )}
              initial={reduce ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{
                duration: 0.8,
                delay: reduce ? 0 : 0.2 + index * 0.07 + barIndex * 0.02,
                ease: EASE_OUT,
              }}
              // balandlik — eng katta qiymatga nisbatan
              style={{ height: `${Math.max(2, (point / max) * 100)}%` }}
            />
          ))}
        </div>
      ) : null}
    </motion.div>
  );
};
