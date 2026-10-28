"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { formatDecimal } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useStockQuery } from "../hooks/use-warehouse";
import { COVER_FULL_DAYS, coverPercent, runwayRows } from "../model/warehouse.rules";
import type { StockRow } from "../model/warehouse.schema";

/** Shkalada ko'rsatiladigan qatorlar soni — eng xavflilari. */
const RUNWAY_LIMIT = 8;
const TICKS = Array.from({ length: COVER_FULL_DAYS }, (_, day) => day);
const AXIS = [0, 10, 20, 30] as const;

type RunwayTone = { bar: string; dot: string; text: string };

const RUNWAY_TONE: Record<string, RunwayTone> = {
  out: { bar: "bg-crit", dot: "ring-crit/35", text: "text-crit" },
  critical: { bar: "bg-linear-to-r from-crit to-warn", dot: "ring-crit/35", text: "text-crit" },
  low: { bar: "bg-linear-to-r from-warn to-gold", dot: "ring-warn/35", text: "text-warn" },
  ok: { bar: "bg-linear-to-r from-forest to-accent", dot: "ring-accent/30", text: "text-ink" },
};
const NEUTRAL_TONE: RunwayTone = { bar: "bg-ink-3", dot: "ring-ink-3/30", text: "text-ink-2" };

const RunwayRow = ({ row, index }: { row: StockRow; index: number }) => {
  const t = useTranslations("warehouse");
  const reduce = useReducedMotion();
  const percent = row.status === "out" ? 0 : coverPercent(row.daysOfCover);
  const tone = RUNWAY_TONE[row.status] ?? NEUTRAL_TONE;
  const delay = 0.2 + index * 0.08;
  const days =
    row.status === "out" || row.daysOfCover === null
      ? t("status.out")
      : t("runway.days", { value: formatDecimal(row.daysOfCover) });

  return (
    <li className="border-border/60 flex flex-col gap-2 border-t py-3 md:grid md:grid-cols-12 md:items-center md:gap-4">
      <div className="min-w-0 md:col-span-3">
        <div className="truncate text-sm font-semibold">{row.name}</div>
        <div className="text-ink-3 truncate text-xs">{row.warehouseName}</div>
      </div>
      <div className="flex items-center gap-3 md:col-span-9">
        <div
          role="meter"
          aria-label={t("runway.meter", { name: row.name, warehouse: row.warehouseName })}
          aria-valuemin={0}
          aria-valuemax={COVER_FULL_DAYS}
          aria-valuenow={Math.min(row.daysOfCover ?? 0, COVER_FULL_DAYS)}
          aria-valuetext={days}
          className="relative h-5.5 flex-1"
        >
          <div aria-hidden className="absolute inset-0 flex gap-0.5">
            {TICKS.map((tick) => (
              <span key={tick} className="bg-ink/5 h-full flex-1 first:rounded-l-full last:rounded-r-full" />
            ))}
          </div>
          <motion.div
            aria-hidden
            className={cn("absolute inset-y-0 left-0 origin-left rounded-full", tone.bar)}
            // kenglik — necha kunga yetishi (30 kun = to'liq shkala)
            style={{ width: `${percent}%` }}
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.2, ease: EASE_OUT, delay }}
          />
          <motion.span
            aria-hidden
            className={cn(
              "bg-ink absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4",
              tone.dot,
            )}
            // nuqta — shkalaning tugash kuni
            style={{ left: `${Math.max(percent, 1.5)}%` }}
            initial={reduce ? false : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE_OUT, delay: delay + 0.9 }}
          />
        </div>
        <span className={cn("num w-20 shrink-0 text-right text-sm font-semibold", tone.text)}>{days}</span>
      </div>
    </li>
  );
};

/** «Tugash vaqti»: har mahsulot × ombor uchun 30 kunlik shkala — qachon tugashi bir qarashda. */
export const StockRunway = ({ className }: { className?: string }) => {
  const t = useTranslations("warehouse.runway");
  const query = useStockQuery(null);

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={5} />}
          isEmpty={({ data }) => runwayRows(data).length === 0}
        >
          {({ data }) => (
            <div>
              <ul>
                {runwayRows(data)
                  .slice(0, RUNWAY_LIMIT)
                  .map((row, index) => (
                    <RunwayRow key={`${row.warehouseId}-${row.productId}`} row={row} index={index} />
                  ))}
              </ul>
              <div aria-hidden className="text-ink-3 num text-2xs flex md:grid md:grid-cols-12 md:gap-4">
                <span className="hidden md:col-span-3 md:block" />
                <span className="flex flex-1 items-center gap-3 md:col-span-9">
                  <span className="flex flex-1 justify-between">
                    {AXIS.map((day) => (
                      <span key={day}>{day === 0 ? t("today") : t("axis", { value: day })}</span>
                    ))}
                  </span>
                  <span className="w-20 shrink-0" />
                </span>
              </div>
            </div>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
