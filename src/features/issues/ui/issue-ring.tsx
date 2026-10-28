"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { EASE_OUT } from "@/shared/ui/motion/reveal";

import { ageOf, isIssueStatus, statusProgress } from "../model/issues.rules";
import { severityTone } from "./issue-tone";

const RADIUS = 20;

/** Hozirgi vaqtga nisbatan yosh (har 30 s dagi ro'yxat yangilanishida qayta hisoblanadi). */
const ageSince = (iso: string) => ageOf(iso, Date.now());

type IssueRingProps = {
  severity: string;
  status: string;
  detectedAt: string;
  /** Kirish animatsiyasi kechikishi (ro'yxatda ketma-ket to'ladi). */
  delay?: number;
  className?: string;
};

/**
 * Halqa — muammo qayerga yetdi: holat bosqichi bo'yicha to'ladi (ochiq → hal bo'ldi).
 * Markazda aniqlangandan beri o'tgan vaqt. API SLA muddatini bermaydi — uni o'ylab topmaymiz.
 */
export const IssueRing = ({ severity, status, detectedAt, delay = 0, className }: IssueRingProps) => {
  const t = useTranslations("issues.ring");
  const tStatus = useTranslations("issues.status");
  const reduce = useReducedMotion();
  const age = ageSince(detectedAt);
  const tone = severityTone(severity);
  const unit = t(age.unit);
  const statusLabel = isIssueStatus(status) ? tStatus(status) : status;

  return (
    <span
      role="img"
      aria-label={t("label", { value: age.value, unit, status: statusLabel })}
      className={cn("relative grid size-14 shrink-0 place-items-center", className)}
    >
      <svg aria-hidden viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
        <circle cx="24" cy="24" r={RADIUS} fill="none" strokeWidth="4" className="stroke-surface-3" />
        <motion.circle
          cx="24"
          cy="24"
          r={RADIUS}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className={tone.stroke}
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: statusProgress(status) }}
          transition={{ duration: 1.4, delay, ease: EASE_OUT }}
        />
      </svg>
      <span aria-hidden className={cn("relative flex flex-col items-center leading-none", tone.text)}>
        <span className="num text-sm font-semibold">{age.value}</span>
        <span className="text-2xs mt-0.5">{unit}</span>
      </span>
    </span>
  );
};
