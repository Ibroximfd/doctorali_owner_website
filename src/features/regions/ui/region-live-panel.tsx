"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { cn } from "@/shared/lib/cn";
import { formatDecimal, formatNumber } from "@/shared/lib/format";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Pill, type PillIntent } from "@/shared/ui/pill";
import { BlockSkeleton, QueryState } from "@/shared/ui/states";

import { isCashAlert, isCourierStatus, isTaskKind, type CourierStatus } from "../model/regions.rules";
import type { RegionCourier, RegionLive } from "../model/regions.schema";

type Tab = "couriers" | "warehouses" | "orders";

const STATUS_DOT: Record<CourierStatus, string> = {
  moving: "bg-good",
  idle: "bg-warn",
  no_signal: "bg-crit",
  off_shift: "bg-ink-3",
};

const STATUS_TEXT: Record<CourierStatus, string> = {
  moving: "text-mint",
  idle: "text-warn",
  no_signal: "text-crit",
  off_shift: "text-ink-3",
};

/** Karta foni holatga qarab: harakatdagi — yalpiz nur, signal yo'q — ember nur. */
const STATUS_CARD: Record<CourierStatus, string> = {
  moving: "border-good/30 bg-good/5",
  idle: "bg-surface-2/60",
  no_signal: "border-crit/30 bg-crit/5",
  off_shift: "bg-surface-2/30",
};

const STOCK_INTENT: Record<string, PillIntent> = { out: "crit", critical: "crit", low: "warn", ok: "good" };

export type LiveQuery = {
  data: { data: RegionLive; generatedAt: string } | undefined;
  error: unknown;
  isPending: boolean;
  isPlaceholderData: boolean;
  refetch: () => unknown;
};

type PanelProps = {
  query: LiveQuery;
  activeCourier: number | null;
  onCourier: (id: number | null) => void;
};

/** Viloyat ichi (yon panel): ogohlantirish kartasi + varaqlar (kuryerlar, omborlar, kun oqimi). */
export const RegionLivePanel = ({ query, activeCourier, onCourier }: PanelProps) => {
  const t = useTranslations("regions.live");
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<Tab>("couriers");

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? undefined : { opacity: 0, x: -24 }}
      transition={{ duration: 0.6, delay: reduce ? 0 : 0.2, ease: EASE_OUT }}
      className="flex flex-col gap-3"
    >
      <QueryState query={query} skeleton={<BlockSkeleton className="h-80" />}>
        {({ data, generatedAt }) => (
          <>
            <RegionAlert live={data} />

            <div
              role="tablist"
              aria-label={t("tabs")}
              className="bg-surface-2/60 flex gap-0.5 rounded-xl border p-1"
            >
              {(["couriers", "warehouses", "orders"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "font-mid relative h-9 flex-1 rounded-lg text-xs transition-colors",
                    tab === key ? "text-ink font-semibold" : "text-ink-2 hover:text-ink",
                  )}
                >
                  {tab === key ? (
                    <motion.span
                      layoutId="region-tab"
                      aria-hidden
                      className="bg-accent-soft absolute inset-0 rounded-lg"
                    />
                  ) : null}
                  <span className="relative">
                    {t(`tab.${key}`)}{" "}
                    <span className="num text-ink-3">
                      {key === "couriers"
                        ? data.couriers.length
                        : key === "warehouses"
                          ? data.warehouses.length
                          : data.summary.ordersToday}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-h-120 overflow-y-auto pr-1"
              >
                {tab === "couriers" ? (
                  <CourierList
                    couriers={data.couriers}
                    now={Date.parse(generatedAt)}
                    active={activeCourier}
                    onPick={onCourier}
                  />
                ) : null}
                {tab === "warehouses" ? <WarehouseList live={data} /> : null}
                {tab === "orders" ? <DayFlow live={data} /> : null}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </QueryState>
    </motion.div>
  );
};

/** Viloyatda kechikkan buyurtma yoki aloqasiz kuryer bo'lsa — eng tepada ember karta. */
const RegionAlert = ({ live }: { live: RegionLive }) => {
  const t = useTranslations("regions.live");
  const lost = live.couriers.filter((courier) => courier.status === "no_signal");
  if (live.summary.stuck === 0 && lost.length === 0) return null;

  return (
    <div role="status" className="border-crit/30 bg-crit/10 rounded-2xl border px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <TriangleAlert aria-hidden className="text-crit size-5 shrink-0" />
        <span className="flex-1 text-sm font-semibold">
          {live.summary.stuck > 0 ? t("stuck", { count: live.summary.stuck }) : t("alertTitle")}
        </span>
      </div>
      {lost.length > 0 ? (
        <p className="text-ink-2 mt-1.5 ml-7.5 text-xs">
          {t("noSignalList", { names: lost.map((courier) => courier.fullName).join(", ") })}
        </p>
      ) : null}
    </div>
  );
};

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

/** Bosqich chizig'idagi bo'laklar soni chegarasi — ko'p buyurtmada ulush saqlanadi. */
const MAX_STEPS = 14;

const CourierSteps = ({ courier }: { courier: RegionCourier }) => {
  const t = useTranslations("regions.live");
  const total = courier.assignedToday;
  if (total <= 0) return null;
  const steps = Math.min(total, MAX_STEPS);
  const done = Math.round((courier.deliveredToday / total) * steps);
  const cancelled = Math.min(steps - done, Math.round((courier.cancelledToday / total) * steps));

  return (
    <span
      role="img"
      aria-label={t("stepsLabel", {
        delivered: courier.deliveredToday,
        cancelled: courier.cancelledToday,
        assigned: total,
      })}
      className="mt-2.5 flex gap-0.5"
    >
      {Array.from({ length: steps }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 flex-1 rounded-full",
            index < done ? "bg-good" : index < done + cancelled ? "bg-crit" : "bg-surface-3",
          )}
        />
      ))}
    </span>
  );
};

const CourierList = ({
  couriers,
  now,
  active,
  onPick,
}: {
  couriers: readonly RegionCourier[];
  now: number;
  active: number | null;
  onPick: (id: number | null) => void;
}) => {
  const t = useTranslations("regions.live");
  const format = useFormat();
  const relative = useRelativeTime();
  if (couriers.length === 0) return <p className="text-ink-3 text-sm">{t("noCouriers")}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {couriers.map((courier) => {
        const status = isCourierStatus(courier.status) ? courier.status : null;
        const alert = isCashAlert(courier, now);
        const task = courier.task;
        const isActive = active === courier.id;
        return (
          <li key={courier.id}>
            <button
              type="button"
              aria-pressed={isActive}
              onClick={() => onPick(isActive ? null : courier.id)}
              className={cn(
                "w-full rounded-2xl border px-3.5 py-3 text-left transition-colors",
                status ? STATUS_CARD[status] : "bg-surface-2/40",
                isActive && "border-accent ring-accent/30 ring-2",
                "hover:border-border-strong",
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className="bg-surface-3 relative grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold">
                  {initialsOf(courier.fullName)}
                  <span
                    aria-hidden
                    className={cn(
                      "border-surface absolute -right-px -bottom-px size-3 rounded-full border-2",
                      status ? STATUS_DOT[status] : "bg-ink-3",
                    )}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{courier.fullName}</span>
                  <span className={cn("block truncate text-xs", status ? STATUS_TEXT[status] : "text-ink-3")}>
                    {status
                      ? t(`status.${status}`, { speed: formatNumber(courier.speedKmh ?? 0) })
                      : courier.status}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={cn("num block text-sm font-semibold", alert ? "text-crit" : "text-ink")}>
                    {format.moneyCompact(courier.cashOnHand)}
                  </span>
                  <span className="text-2xs text-ink-3 block">{t("onHandLabel")}</span>
                </span>
              </span>
              <span className="text-ink-2 mt-2 block text-xs">
                {task && isTaskKind(task.kind)
                  ? t(`task.${task.kind}`, {
                      order: task.orderNumber ?? "—",
                      address: task.address ?? "—",
                      eta: task.etaMinutes ?? 0,
                    })
                  : courier.lastSignalAt
                    ? t("lastSignal", { when: relative(courier.lastSignalAt) })
                    : t("noTask")}
              </span>
              <CourierSteps courier={courier} />
              <span className="num text-2xs text-ink-3 mt-1.5 flex flex-wrap gap-x-2">
                <span>
                  {t("doneToday", { delivered: courier.deliveredToday, assigned: courier.assignedToday })}
                </span>
                {courier.cancelledToday > 0 ? (
                  <span>{t("cancelledToday", { count: courier.cancelledToday })}</span>
                ) : null}
                <span className="sr-only">
                  {t("onHand", { value: format.moneyCompact(courier.cashOnHand) })}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const WarehouseList = ({ live }: { live: RegionLive }) => {
  const t = useTranslations("regions.live");
  const format = useFormat();
  if (live.warehouses.length === 0) return <p className="text-ink-3 text-sm">{t("noWarehouses")}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {live.warehouses.map((warehouse) => (
        <li key={warehouse.id} className="border-gold/25 bg-gold/5 rounded-2xl border p-3.5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="bg-gold size-2.5 shrink-0 rotate-45 rounded-xs" />
            <span className="text-sm font-semibold">{warehouse.name}</span>
            <span className="num text-ink-2 ml-auto text-xs">
              {formatNumber(warehouse.stockUnits)} · {format.moneyCompact(warehouse.stockValue)}
            </span>
          </div>
          {warehouse.keeper ? (
            <div className="text-2xs text-ink-3 mt-0.5 ml-4.5">{t("keeper", { name: warehouse.keeper })}</div>
          ) : null}
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {warehouse.products.map((product) => (
              <li key={product.name} className="flex items-center gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate">{product.name}</span>
                <span className="num">{formatNumber(product.qty)}</span>
                {product.daysOfCover === null ? null : (
                  <span className="text-2xs text-ink-3 num">
                    {t("days", { value: formatDecimal(product.daysOfCover) })}
                  </span>
                )}
                <Pill intent={STOCK_INTENT[product.status] ?? "neutral"}>
                  {product.status in STOCK_INTENT ? t(`stock_.${product.status}`) : product.status}
                </Pill>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
};

const ORDER_STATUSES = ["pending", "confirmed", "shipping", "delivered", "cancelled"] as const;
const ORDER_TONE: Record<(typeof ORDER_STATUSES)[number], { bg: string; text: string }> = {
  pending: { bg: "bg-order-pending", text: "text-order-pending" },
  confirmed: { bg: "bg-order-confirmed", text: "text-order-confirmed" },
  shipping: { bg: "bg-order-shipping", text: "text-order-shipping" },
  delivered: { bg: "bg-order-delivered", text: "text-order-delivered" },
  cancelled: { bg: "bg-order-cancelled", text: "text-order-cancelled" },
};
/** Nuqta matritsasida bitta bosqich uchun ko'pi bilan shuncha katak; qolgani «+N». */
const MAX_DOTS = 40;
/** Kataklar yorqinligi navbatlanadi — matritsa «to'qima» kabi o'qiladi. */
const DOT_SHADE = ["opacity-50", "opacity-65", "opacity-80", "opacity-100"] as const;

/** «Kun oqimi» — buyurtmalar bosqichlar bo'yicha: har buyurtma bitta katak. */
const DayFlow = ({ live }: { live: RegionLive }) => {
  const t = useTranslations("regions.live");
  const reduce = useReducedMotion();

  return (
    <section aria-label={t("dayFlow")}>
      <p className="text-ink-3 mb-3 text-xs">{t("dayFlowNote")}</p>
      <ul className="flex flex-col gap-3.5">
        {ORDER_STATUSES.map((status) => {
          const value = live.orders[status] ?? 0;
          const shown = Math.min(value, MAX_DOTS);
          const tone = ORDER_TONE[status];
          return (
            <li key={status}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-ink-2 text-xs">{t(`orders.${status}`)}</span>
                <span className={cn("num text-xl font-semibold", tone.text)}>{formatNumber(value)}</span>
              </div>
              <div aria-hidden className="mt-1.5 flex flex-wrap items-center gap-0.5">
                {Array.from({ length: shown }, (_, index) => (
                  <motion.span
                    key={index}
                    className={cn("size-2.5 rounded-xs", tone.bg, DOT_SHADE[index % DOT_SHADE.length])}
                    initial={reduce ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: reduce ? 0 : index * 0.012, ease: EASE_OUT }}
                  />
                ))}
                {value > MAX_DOTS ? (
                  <span className="num text-2xs text-ink-3 ml-1">
                    {t("more", { count: value - MAX_DOTS })}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
