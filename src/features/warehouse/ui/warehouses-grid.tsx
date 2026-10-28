"use client";

import { motion, useReducedMotion } from "motion/react";
import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatDecimal, formatNumber } from "@/shared/lib/format";
import { useRegionName } from "@/shared/meta/use-region-name";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Pill } from "@/shared/ui/pill";
import { BlockSkeleton, QueryState } from "@/shared/ui/states";

import { useWarehouseDrawer } from "../hooks/use-warehouse-drawer";
import { useWarehousesQuery } from "../hooks/use-warehouse";
import { coverPercent, isMarketplace } from "../model/warehouse.rules";
import type { Warehouse } from "../model/warehouse.schema";
import { StockStatusPill } from "./stock-status";

type TankTone = { border: string; fill: string; wave: string };

/** «Idish» rangi holat bilan bir xil ma'noda: tugagan/kritik — qizg'ish, kam — oltin, yetarli — yalpiz. */
const TANK_TONE: Record<string, TankTone> = {
  out: { border: "border-crit/40", fill: "from-crit/45 to-crit/10", wave: "fill-crit/45" },
  critical: { border: "border-crit/40", fill: "from-crit/45 to-crit/10", wave: "fill-crit/45" },
  low: { border: "border-warn/35", fill: "from-gold/55 to-gold/10", wave: "fill-gold/55" },
  ok: { border: "border-border", fill: "from-accent/55 to-forest/40", wave: "fill-accent/55" },
};
const NEUTRAL_TONE: TankTone = {
  border: "border-border",
  fill: "from-ink-3/40 to-ink-3/10",
  wave: "fill-ink-3/40",
};

/** Ism-familiyaning bosh harflari (avatar o'rnida). */
const initials = (fullName: string): string =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

/** To'lqin: ikki bir xil bo'lak yonma-yon, yarim kenglikka siljiydi — chok ko'rinmaydi. */
const WAVE_PATH = "M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 V20 H0 Z";

const Wave = ({ className }: { className: string }) => {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden className="absolute inset-x-0 -top-3 block h-3.5 overflow-hidden">
      <motion.span
        className="flex h-full w-full"
        animate={reduce ? undefined : { x: ["0%", "-100%"] }}
        transition={{ duration: 4, ease: "linear", repeat: Infinity }}
      >
        {[0, 1].map((copy) => (
          <svg
            key={copy}
            viewBox="0 0 200 20"
            preserveAspectRatio="none"
            className={cn("h-full w-full shrink-0", className)}
          >
            <path d={WAVE_PATH} />
          </svg>
        ))}
      </motion.span>
    </span>
  );
};

const WarehouseTank = ({ warehouse, index }: { warehouse: Warehouse; index: number }) => {
  const t = useTranslations("warehouse.grid");
  const format = useFormat();
  const regionName = useRegionName();
  const reduce = useReducedMotion();
  const { openWarehouse } = useWarehouseDrawer();
  const level = coverPercent(warehouse.daysOfCover);
  const tone = TANK_TONE[warehouse.status] ?? NEUTRAL_TONE;
  const delay = 0.1 + index * 0.08;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: EASE_OUT, delay }}
    >
      <motion.button
        type="button"
        onClick={() => openWarehouse(warehouse.id)}
        aria-label={t("open", { name: warehouse.name })}
        whileHover={reduce ? undefined : { y: -3 }}
        whileTap={reduce ? undefined : { scale: 0.98 }}
        className={cn(
          "panel-surface hover:border-border-strong focus-visible:ring-accent flex h-full w-full flex-col gap-3.5 rounded-3xl border p-4.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
          tone.border,
        )}
      >
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1">
            <span className="text-md block truncate font-bold">{warehouse.name}</span>
            <span className="text-ink-3 block truncate text-xs">
              {warehouse.regions.map(regionName).join(" · ") || t("noRegions")}
            </span>
          </span>
          <StockStatusPill status={warehouse.status} />
        </span>

        <span className="bg-ink/5 border-border relative block h-44 overflow-hidden rounded-2xl border">
          <motion.span
            aria-hidden
            className={cn("absolute inset-x-0 bottom-0 block origin-bottom bg-linear-to-b", tone.fill)}
            // balandlik — «necha kunga yetadi» foizi (30 kun = to'liq)
            style={{ height: `${level}%` }}
            initial={reduce ? false : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.6, ease: EASE_OUT, delay }}
          >
            {level > 0 ? <Wave className={tone.wave} /> : null}
          </motion.span>
          <span className="absolute top-3 left-3.5">
            <span className="num block text-3xl font-semibold">{formatNumber(warehouse.stockUnits)}</span>
            <span className="text-ink-2 block text-xs">
              {t("unitsValue", { value: format.moneyCompact(warehouse.stockValue) })}
            </span>
          </span>
          <span className="bg-ink/85 text-bg num absolute right-3.5 bottom-3 rounded-md px-2 py-0.5 text-sm font-semibold">
            {warehouse.daysOfCover === null
              ? t("noCover")
              : t("days", { value: formatDecimal(warehouse.daysOfCover) })}
          </span>
        </span>

        <span className="text-ink-2 flex justify-between gap-2 text-xs">
          <span>
            {t("inbound")} <span className="num text-info">+{formatNumber(warehouse.inbound)}</span>
          </span>
          <span>
            {t("outbound")} <span className="num text-good">−{formatNumber(warehouse.outbound)}</span>
          </span>
        </span>

        <span className="text-ink-2 mt-auto flex min-w-0 items-center gap-2 text-xs">
          <span
            aria-hidden
            className="bg-ink/10 text-ink text-2xs grid size-6 shrink-0 place-items-center rounded-full font-bold"
          >
            {warehouse.keeper ? initials(warehouse.keeper.fullName) : <UserRound className="size-3.5" />}
          </span>
          <span className="truncate">{warehouse.keeper?.fullName ?? t("noKeeper")}</span>
          {isMarketplace(warehouse.source) ? (
            <Pill intent="info" className="ml-auto">
              {t("marketplace")}
            </Pill>
          ) : null}
        </span>
      </motion.button>
    </motion.li>
  );
};

/** Omborlar «idish» sifatida: qoldiq darajasi necha kunga yetishini bildiradi. Bosilsa — ombor kartasi. */
export const WarehousesGrid = ({ className }: { className?: string }) => {
  const t = useTranslations("warehouse.grid");
  const query = useWarehousesQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          isEmpty={({ data }) => data.length === 0}
          skeleton={
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <BlockSkeleton key={index} className="h-80 rounded-3xl" />
              ))}
            </div>
          }
        >
          {({ data }) => (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {data.map((warehouse, index) => (
                <WarehouseTank key={warehouse.id} warehouse={warehouse} index={index} />
              ))}
            </ul>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
