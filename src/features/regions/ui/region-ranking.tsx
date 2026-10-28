"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { useRegionName } from "@/shared/meta/use-region-name";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { TONE_CLASS } from "@/shared/ui/region-map";

import { metricTone, regionScore, type MapMetric } from "../model/regions.rules";
import type { RegionRow } from "../model/regions.schema";

const RANKING_SIZE = 8;

type RankingProps = {
  rows: readonly RegionRow[];
  metric: MapMetric;
  onPick: (code: string) => void;
};

/** Ustun uzunligi 0..100: yetkazishda ulushning o'zi, qolganida eng kattasiga nisbatan. */
const barShare = (row: RegionRow, metric: MapMetric, max: number): number => {
  if (metric === "delivery") return row.successRate ?? 0;
  const value = metric === "stock" ? row.stockUnits : row.cashOnCouriers;
  return max > 0 ? (value / max) * 100 : 0;
};

/**
 * Viloyat tanlanmagan holat: metrikaga qarab eng muhim hududlar — raqam, holat rangidagi
 * chiziq; bosilsa ichiga kiriladi.
 */
export const RegionRanking = ({ rows, metric, onPick }: RankingProps) => {
  const t = useTranslations("regions");
  const regionName = useRegionName();
  const format = useFormat();
  const reduce = useReducedMotion();
  const sorted = [...rows].sort((a, b) => {
    if (metric === "stock") return b.lowSkus - a.lowSkus || a.stockUnits - b.stockUnits;
    if (metric === "couriers") return b.cashOnCouriers - a.cashOnCouriers;
    return regionScore(a) - regionScore(b);
  });
  const max = Math.max(0, ...rows.map((row) => (metric === "stock" ? row.stockUnits : row.cashOnCouriers)));

  const valueOf = (row: RegionRow): string => {
    if (metric === "stock") return t("rankingValue.stock", { units: formatNumber(row.stockUnits) });
    if (metric === "couriers")
      return t("rankingValue.couriers", { cash: format.moneyCompact(row.cashOnCouriers) });
    return formatPercent(row.successRate);
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? undefined : { opacity: 0, x: -16 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      <p className="text-ink-3 mb-3 text-xs">{t(`ranking.${metric}`)}</p>
      <ol className="flex flex-col gap-1">
        {sorted.slice(0, RANKING_SIZE).map((row, index) => {
          const tone = TONE_CLASS[metricTone(row, metric)];
          return (
            <li key={row.region}>
              <button
                type="button"
                onClick={() => onPick(row.region)}
                aria-label={t("open", { name: regionName(row.region) })}
                className="group hover:bg-surface-2 block w-full rounded-xl px-2 py-2 text-left transition-colors"
              >
                <span className="flex items-baseline gap-2">
                  <span className="num text-2xs text-ink-3 w-4">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {regionName(row.region)}
                  </span>
                  <span className={cn("num text-sm font-semibold", tone.text)}>{valueOf(row)}</span>
                </span>
                <span className="bg-surface-3 mt-1.5 ml-6 block h-1 overflow-hidden rounded-full">
                  <motion.span
                    className={cn("block h-full origin-left rounded-full", tone.bg)}
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.9, delay: reduce ? 0 : 0.3 + index * 0.06, ease: EASE_OUT }}
                    // uzunlik — hisoblangan ulush
                    style={{ width: `${Math.max(2, Math.min(100, barShare(row, metric, max)))}%` }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </motion.div>
  );
};
