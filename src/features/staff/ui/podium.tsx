"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { formatDecimal, initialsOf } from "@/shared/lib/format";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { QueryState } from "@/shared/ui/states";

import { useLeaderboardQuery, useStaffView } from "../hooks/use-staff";
import { leadColumn, metricValue, sortByRank } from "../model/staff.rules";
import type { StaffColumn, StaffRow } from "../model/staff.schema";
import { useMetricFormat, useMetricLabel } from "./metric-format";

/**
 * Shohsupa o'rinlari: DOM tartibi 1 → 2 → 3 (ekran o'quvchi uchun), ko'rinishda 2 · 1 · 3.
 * 1 — tilla, 2 — kumush (`ink-2`), 3 — bronza (`serious`).
 */
const PLACES = [
  {
    order: "order-2",
    avatar: "size-18 text-xl md:size-26 md:text-3xl",
    pillar: "h-40 md:h-56",
    ring: "from-gold to-gold/40",
    halo: "bg-gold/40",
    column: "from-gold/15 border-gold/35",
    accent: "text-gold",
    delay: 0.1,
  },
  {
    order: "order-1",
    avatar: "size-15 text-lg md:size-21 md:text-2xl",
    pillar: "h-32 md:h-44",
    ring: "from-ink-2 to-ink-2/40",
    halo: "bg-ink-2/25",
    column: "from-ink-2/10 border-ink-2/20",
    accent: "text-ink-2",
    delay: 0.25,
  },
  {
    order: "order-3",
    avatar: "size-14 text-base md:size-19 md:text-2xl",
    pillar: "h-26 md:h-36",
    ring: "from-serious to-serious/40",
    halo: "bg-serious/25",
    column: "from-serious/10 border-serious/25",
    accent: "text-serious",
    delay: 0.4,
  },
] as const;

/** Eng yaxshi uchlik: ustunlar pastdan o'sadi, 1-o'rin o'rtada — tilla halqa va nur. */
export const Podium = () => {
  const t = useTranslations("staff.podium");
  const query = useLeaderboardQuery();
  return (
    <section aria-label={t("label")} className="mx-auto mb-6 w-full max-w-4xl md:mb-8">
      <QueryState
        query={query}
        skeleton={<div className="skeleton h-56 w-full rounded-3xl md:h-80" />}
        isEmpty={({ data }) => data.rows.every((row) => row.score === null)}
        empty={<></>}
      >
        {({ data }) => (
          <PodiumStage
            top={sortByRank(data.rows.filter((row) => row.score !== null)).slice(0, 3)}
            lead={leadColumn(data.columns)}
          />
        )}
      </QueryState>
    </section>
  );
};

const PodiumStage = ({ top, lead }: { top: readonly StaffRow[]; lead: StaffColumn | null }) => {
  const t = useTranslations("staff.podium");
  const tBoard = useTranslations("staff.board");
  const formatMetric = useMetricFormat();
  const metricLabel = useMetricLabel();
  const reduce = useReducedMotion();
  const { openStaff } = useStaffView();

  return (
    <ol className="grid grid-cols-3 items-end gap-2 md:gap-4.5">
      {top.map((row, index) => {
        const place = PLACES[index];
        if (!place) return null;
        const value = lead ? metricValue(row.metrics, lead.key) : null;
        return (
          <li key={row.id} className={cn("min-w-0", place.order)}>
            <motion.button
              type="button"
              onClick={() => openStaff(row.id)}
              aria-label={tBoard("open", { name: row.fullName })}
              initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, ease: EASE_OUT, delay: place.delay }}
              className="group flex w-full flex-col items-center text-center"
            >
              <span className={cn("relative grid shrink-0 place-items-center", place.avatar)}>
                <motion.span
                  aria-hidden
                  className={cn("absolute -inset-2.5 rounded-full blur-xl", place.halo)}
                  animate={reduce ? undefined : { opacity: [0.55, 1, 0.55], scale: [1, 1.08, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <span className={cn("absolute inset-0 rounded-full bg-linear-140 p-0.75", place.ring)}>
                  <span className="bg-surface-2 text-ink font-display grid size-full place-items-center rounded-full">
                    {initialsOf(row.fullName)}
                  </span>
                </span>
              </span>
              <span className="text-ink mt-3 line-clamp-1 max-w-full text-sm font-bold group-hover:underline md:text-lg">
                {row.fullName}
              </span>
              <span className="text-ink-3 line-clamp-1 max-w-full text-xs">
                {row.team ?? row.filial ?? ""}
              </span>
              <motion.span
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: place.delay }}
                className={cn(
                  "mt-3.5 flex w-full origin-bottom flex-col items-center rounded-t-3xl rounded-b-md border bg-linear-to-b to-transparent px-1 pt-4",
                  place.pillar,
                  place.column,
                )}
              >
                <span className={cn("font-display text-3xl leading-none md:text-5xl", place.accent)}>
                  {index + 1}
                </span>
                <span className="num text-ink mt-2 text-base font-semibold md:text-2xl">
                  {lead && value !== null ? formatMetric(value, lead.unit) : formatDecimal(row.score)}
                </span>
                <span className="text-ink-2 text-2xs line-clamp-2 md:text-xs">
                  {lead && value !== null
                    ? t("caption", { metric: metricLabel(lead.key), score: formatDecimal(row.score ?? 0) })
                    : t("score")}
                </span>
              </motion.span>
            </motion.button>
          </li>
        );
      })}
    </ol>
  );
};
