"use client";

import { motion, useReducedMotion } from "motion/react";
import { BatteryMedium, Banknote, Check, Hourglass, Navigation, Radio, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { useRegionName } from "@/shared/meta/use-region-name";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Pill } from "@/shared/ui/pill";
import { BlockSkeleton, NoResults, QueryState } from "@/shared/ui/states";

import { useLiveBoardQuery } from "../hooks/use-logistics";
import { isCashOverheld, isLiveStatus, sortLive, type LiveStatus } from "../model/logistics.rules";
import type { LiveBoard, LiveCourier } from "../model/logistics.schema";

const STATUS_DOT: Record<LiveStatus, string> = {
  moving: "bg-good",
  idle: "bg-warn",
  no_signal: "bg-crit",
  off_shift: "bg-ink-3",
};

const ALL = "__all__";

/**
 * Jonli doska: hudud kartalari (ishlayotgan / jami kuryer, yetkazildi, kutilmoqda, bugungi naqd) va
 * kuryerlar ro'yxati holat chirog'i bilan. Signal yo'q va naqdi ko'p qolganlar tepada.
 */
export const LiveBoardCard = ({ className }: { className?: string }) => {
  const t = useTranslations("logistics.live");
  const query = useLiveBoardQuery();
  const [region, setRegion] = useState<string>(ALL);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader
        title={t("title")}
        description={t("description")}
        action={
          <span className="text-good text-2xs inline-flex items-center gap-1.5 font-semibold">
            <span aria-hidden className="bg-good animate-live size-2 rounded-full" />
            {t("live")}
          </span>
        }
      />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<BlockSkeleton className="h-72" />}
          isEmpty={({ data }) => data.couriers.length === 0}
        >
          {({ data, generatedAt }) => (
            <Board board={data} now={Date.parse(generatedAt)} region={region} onRegion={setRegion} />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};

const Board = ({
  board,
  now,
  region,
  onRegion,
}: {
  board: LiveBoard;
  now: number;
  region: string;
  onRegion: (region: string) => void;
}) => {
  const t = useTranslations("logistics.live");
  const format = useFormat();
  const regionName = useRegionName();
  const reduce = useReducedMotion();
  const couriers = sortLive(
    board.couriers.filter((courier) => region === ALL || courier.region === region),
    now,
  );
  const working = board.regions.reduce((sum, row) => sum + row.couriersWorking, 0);
  const total = board.regions.reduce((sum, row) => sum + row.couriersTotal, 0);

  const tiles = [
    {
      key: ALL,
      name: t("allRegions"),
      working,
      total,
      delivered: sumOf(board, "deliveredToday"),
      pending: sumOf(board, "pendingToday"),
      cash: sumOf(board, "cashToday"),
    },
    ...[...board.regions]
      .sort((a, b) => b.couriersTotal - a.couriersTotal)
      .map((row) => ({
        key: row.region,
        name: regionName(row.region),
        working: row.couriersWorking,
        total: row.couriersTotal,
        delivered: row.deliveredToday,
        pending: row.pendingToday,
        cash: row.cashToday,
      })),
  ];

  return (
    <>
      <ul aria-label={t("regions")} className="fade-mask-x -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {tiles.map((tile) => {
          const isActive = tile.key === region;
          return (
            <li key={tile.key} className="w-48 shrink-0">
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => onRegion(tile.key)}
                className={cn(
                  "flex w-full flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors",
                  isActive ? "border-accent bg-accent-soft" : "bg-surface hover:bg-surface-2",
                )}
              >
                <span className="truncate text-sm font-semibold">{tile.name}</span>
                <span className="text-2xs text-ink-3">
                  {t("working")}{" "}
                  <span className="num text-ink font-semibold">
                    {formatNumber(tile.working)}/{formatNumber(tile.total)}
                  </span>
                </span>
                <span className="text-2xs flex gap-2">
                  <span className="text-good num inline-flex items-center gap-0.5" title={t("delivered")}>
                    <Check aria-label={t("delivered")} className="size-3" />
                    {formatNumber(tile.delivered)}
                  </span>
                  <span className="text-warn num inline-flex items-center gap-0.5" title={t("pending")}>
                    <Hourglass aria-label={t("pending")} className="size-3" />
                    {formatNumber(tile.pending)}
                  </span>
                </span>
                <span className="text-2xs text-ink-3">
                  {t("cashToday")} <span className="num text-ink">{format.moneyCompact(tile.cash)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {couriers.length === 0 ? (
        <NoResults onClear={() => onRegion(ALL)} />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {couriers.map((courier, index) => (
            <motion.li
              key={courier.id}
              layout={reduce ? false : "position"}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT, delay: Math.min(index, 9) * 0.03 }}
            >
              <CourierTile courier={courier} now={now} />
            </motion.li>
          ))}
        </ul>
      )}
    </>
  );
};

const sumOf = (board: LiveBoard, key: "deliveredToday" | "pendingToday" | "cashToday"): number =>
  board.regions.reduce((sum, row) => sum + row[key], 0);

const CourierTile = ({ courier, now }: { courier: LiveCourier; now: number }) => {
  const t = useTranslations("logistics.live");
  const format = useFormat();
  const relative = useRelativeTime();
  const status = isLiveStatus(courier.status) ? courier.status : null;
  const overheld = isCashOverheld(courier, now);

  return (
    <div
      className={cn("bg-surface flex h-full flex-col gap-2 rounded-xl border p-3", overheld && "border-crit")}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="relative flex size-2.5">
          {status === "moving" || status === "no_signal" ? (
            <span className={cn("animate-ping-soft absolute inset-0 rounded-full", STATUS_DOT[status])} />
          ) : null}
          <span className={cn("relative size-2.5 rounded-full", status ? STATUS_DOT[status] : "bg-ink-3")} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{courier.fullName}</span>
        {courier.source === "marketplace" ? <Pill intent="info">{t("marketplace")}</Pill> : null}
      </div>
      <div className="text-2xs text-ink-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1">
          {status === "moving" ? (
            <Navigation aria-hidden className="size-3" />
          ) : (
            <Radio aria-hidden className="size-3" />
          )}
          {status ? t(`status.${status}`, { speed: formatNumber(courier.speedKmh ?? 0) }) : courier.status}
          {courier.lastSignalAt && status !== "moving" ? ` · ${relative(courier.lastSignalAt)}` : ""}
        </span>
        {courier.batteryPct === null ? null : (
          <span className="inline-flex items-center gap-1">
            <BatteryMedium aria-hidden className="size-3" />
            {courier.batteryPct}%
          </span>
        )}
      </div>
      <div className="text-2xs flex gap-3">
        <span className="text-ink-3">
          {t("assigned")} <span className="num text-ink">{formatNumber(courier.assignedToday)}</span>
        </span>
        <span className="text-good num inline-flex items-center gap-0.5">
          <Check aria-label={t("delivered")} className="size-3" />
          {formatNumber(courier.deliveredToday)}
        </span>
        <span className="text-crit num inline-flex items-center gap-0.5">
          <X aria-label={t("cancelled")} className="size-3" />
          {formatNumber(courier.cancelledToday)}
        </span>
      </div>
      {courier.cashOnHand > 0 ? (
        <div
          className={cn(
            "mt-auto flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs",
            overheld ? "bg-crit-soft text-crit font-semibold" : "bg-surface-2 text-ink-2",
          )}
        >
          <Banknote aria-hidden className="size-3.5" />
          {t("cash", { value: format.moneyCompact(courier.cashOnHand) })}
          {courier.cashSince ? (
            <span className="text-2xs opacity-80">· {relative(courier.cashSince)}</span>
          ) : null}
          {courier.handoverPending ? (
            <Pill intent="warn" className="ml-auto">
              {t("handover")}
            </Pill>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
