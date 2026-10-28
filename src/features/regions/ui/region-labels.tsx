"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { pointToPercent } from "@/shared/config/uz-map";
import { cn } from "@/shared/lib/cn";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { TONE_CLASS, type RegionTone } from "@/shared/ui/region-map";

export type MapLabel = {
  key: string;
  /** Xarita koordinatasi (`regionAnchor` / `projectLatLng`). */
  point: { x: number; y: number };
  title: ReactNode;
  value: ReactNode;
  tone: RegionTone;
};

type FloatingLabelsProps = {
  labels: readonly MapLabel[];
  /** Hozirgi `viewBox` (yaqinlashganda foiz o'rni shunga nisbatan). */
  viewBox?: string;
  /** Kamera to'xtagandan keyin chiqadi (yaqinlashish animatsiyasi tugashini kutadi). */
  delay?: number;
};

/**
 * Xarita ustida suzuvchi yorliqlar: nom va raqam, chegara rangi — holat. Ekran o'quvchidan
 * yashirin: xuddi shu ma'lumot viloyat tugmalarining nomida va yon ro'yxatda bor.
 * Telefonda yorliqlar xaritani to'sib qo'ymasligi uchun ko'rsatilmaydi.
 */
export const FloatingLabels = ({ labels, viewBox, delay = 0.9 }: FloatingLabelsProps) => {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden className="hidden md:block">
      {labels.map((label, index) => {
        const { left, top } = pointToPercent(label.point, viewBox);
        if (left < 0 || left > 100 || top < 0 || top > 100) return null;
        const tone = TONE_CLASS[label.tone];
        return (
          <motion.div
            key={label.key}
            initial={reduce ? false : { opacity: 0, filter: "blur(8px)", y: 10 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.7, delay: reduce ? 0 : delay + index * 0.12, ease: EASE_OUT }}
            className="absolute"
            // o'rin — xarita nuqtasidan hisoblangan foiz (token emas, geometriya)
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <div
              className={cn(
                "bg-bg/85 shadow-pop -mt-3.5 -translate-x-1/2 -translate-y-full rounded-lg border px-2.5 py-1.5 whitespace-nowrap",
                tone.border,
              )}
            >
              <div className="text-2xs text-ink-2">{label.title}</div>
              <div className={cn("num text-sm font-semibold", tone.text)}>{label.value}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
