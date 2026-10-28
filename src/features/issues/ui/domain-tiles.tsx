"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { EASE_OUT } from "@/shared/ui/motion/reveal";

import type { DomainSummary, IssueDomain } from "../model/issues.rules";
import { severityTone } from "./issue-tone";

type DomainTilesProps = {
  summary: readonly DomainSummary[];
  active: IssueDomain | null;
  onToggle: (domain: IssueDomain) => void;
};

/**
 * Yo'nalishlar bo'yicha plitkalar: soni va nisbiy chiziq (eng jiddiy daraja rangida).
 * Plitka — filtr: bosilsa ro'yxat shu yo'nalishga toraytiriladi.
 */
export const DomainTiles = ({ summary, active, onToggle }: DomainTilesProps) => {
  const t = useTranslations("issues");
  const reduce = useReducedMotion();
  const max = Math.max(1, ...summary.map((item) => item.count));

  return (
    <div
      role="group"
      aria-label={t("board.domainFilter")}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
    >
      {summary.map((item, index) => {
        const tone = severityTone(item.worst);
        const isActive = active === item.domain;
        return (
          <motion.button
            key={item.domain}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(item.domain)}
            initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: index * 0.05, ease: EASE_OUT }}
            className={cn(
              "rounded-2xl border px-4 py-3.5 text-left transition-colors",
              isActive ? "border-accent/50 bg-accent-soft" : "panel-surface hover:border-border-strong",
              "focus-visible:ring-accent focus-visible:ring-2 focus-visible:outline-none",
            )}
          >
            <span className="text-ink-2 flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{t(`domain.${item.domain}`)}</span>
              <span className={cn("num text-sm font-semibold", item.count > 0 ? tone.text : "text-ink-3")}>
                {formatNumber(item.count)}
              </span>
            </span>
            <span aria-hidden className="bg-surface-3 mt-2.5 block h-1.5 overflow-hidden rounded-full">
              <motion.span
                className={cn("block h-full origin-left rounded-full", tone.bg)}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: item.count / max }}
                transition={{ duration: 1.1, delay: index * 0.05, ease: EASE_OUT }}
              />
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};
