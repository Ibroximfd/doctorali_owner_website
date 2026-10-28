"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { QueryState } from "@/shared/ui/states";

import { useFeedQuery } from "../hooks/use-overview";
import { feedDotClass } from "../model/overview.rules";
import type { FeedEvent } from "../model/overview.schema";

/** Bitta hodisa ekrandan qancha vaqtda o'tadi (soniya) — tasma tezligi hodisalar soniga mos. */
const SECONDS_PER_EVENT = 6;

/**
 * Jonli tasma (marquee): oxirgi hodisalar xarita sahnasi ostida cheksiz suzadi. Ma'lumot
 * «Hozir» lentasi bilan bir xil so'rovdan; harakat kamaytirilsa — tasma to'xtab turadi.
 * Ekran o'quvchiga bir marta o'qiladi (ikkinchi nusxa yashirin).
 */
export const FeedTicker = ({ className }: { className?: string }) => {
  const t = useTranslations("overview.ticker");
  const query = useFeedQuery();

  return (
    <section aria-label={t("label")} className={cn("relative", className)}>
      <QueryState
        query={query}
        skeleton={<div className="skeleton mx-4 my-3.5 h-4" />}
        isEmpty={(events) => events.length === 0}
        empty={null}
      >
        {(events) => <Track events={events} />}
      </QueryState>
    </section>
  );
};

const Track = ({ events }: { events: readonly FeedEvent[] }) => {
  const reduce = useReducedMotion();

  return (
    <div className="fade-mask-x flex h-11 items-center overflow-hidden">
      <motion.div
        className="flex shrink-0 gap-12 pr-12 whitespace-nowrap"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: events.length * SECONDS_PER_EVENT, ease: "linear", repeat: Infinity }}
      >
        <TickerItems events={events} />
        <TickerItems events={events} hidden />
      </motion.div>
    </div>
  );
};

const TickerItems = ({ events, hidden = false }: { events: readonly FeedEvent[]; hidden?: boolean }) => (
  <ul aria-hidden={hidden || undefined} className="text-ink-2 flex shrink-0 gap-12 text-sm">
    {events.map((event) => (
      <li key={event.id} className="inline-flex items-center gap-2.5">
        <span aria-hidden className={cn("size-1.5 rounded-full", feedDotClass(event.kind))} />
        {event.title}
        {event.filial ? <span className="text-ink-3">· {event.filial}</span> : null}
        {event.amount === null ? null : (
          <span className="num text-ink font-semibold">{formatNumber(event.amount)}</span>
        )}
      </li>
    ))}
  </ul>
);
