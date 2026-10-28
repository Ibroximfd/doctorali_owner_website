"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/shared/lib/cn";

import { healthTone, type HealthTone } from "../model/ai.rules";

const STROKE: Record<HealthTone, string> = {
  good: "stroke-hero-ink",
  warn: "stroke-gold",
  crit: "stroke-hero-alert",
};

type ScoreRingProps = { score: number | null; label: string; className?: string };

/**
 * Biznes «sog'lom ball»i (0–100) — AI shari atrofidagi ingichka halqa: ochilganda chizilib to'ladi.
 * Raqamning o'zi sarlavhada; halqa `meter` sifatida ekran o'quvchiga ham qiymatni aytadi.
 */
export const ScoreRing = ({ score, label, className }: ScoreRingProps) => {
  const reduce = useReducedMotion();
  const value = score ?? 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score ?? undefined}
      className={cn("pointer-events-none", className)}
    >
      <svg viewBox="0 0 150 150" className="size-full -rotate-90" aria-hidden>
        <circle cx="75" cy="75" r="48" fill="none" strokeWidth="3" className="stroke-hero-ink/10" />
        {score === null ? null : (
          <motion.circle
            cx="75"
            cy="75"
            r="48"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className={STROKE[healthTone(value)]}
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: value / 100 }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </svg>
    </div>
  );
};
