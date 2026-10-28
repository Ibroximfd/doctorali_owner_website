"use client";

import { motion, useReducedMotion } from "motion/react";

import { isRegionCode, type RegionCode } from "@/shared/config/regions";
import { UZ_MAP_HUB, arcPath, regionAnchor } from "@/shared/config/uz-map";
import { cn } from "@/shared/lib/cn";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { TONE_CLASS, type RegionTone } from "@/shared/ui/region-map";

export type ArcRegion = { code: string; orders: number; tone: RegionTone };

/** Eng ingichka va eng qalin yoy (xarita birligida) — hajmga mutanosib. */
const STROKE_MIN = 0.9;
const STROKE_SPAN = 2.4;

/**
 * Butun xarita sahnasi: Toshkent markazidan har viloyatga tilla yoy (hajmi bo'yicha qalinlik).
 * Yoy bir marta chizilib to'xtaydi — doimiy (cheksiz) animatsiya yo'q: xarita katta SVG,
 * har kadrda qayta chizilsa sichqoncha harakati va sahifa aylantirish qotadi.
 * Faqat bezak — ma'lumot viloyat tugmalarida, nom yozuvlarida va reytingda.
 */
export const RegionArcs = ({ regions }: { regions: readonly ArcRegion[] }) => {
  const reduce = useReducedMotion();
  const hub = regionAnchor(UZ_MAP_HUB);
  const targets = regions.filter(
    (region): region is ArcRegion & { code: RegionCode } =>
      isRegionCode(region.code) && region.code !== UZ_MAP_HUB && region.orders > 0,
  );
  const maxOrders = Math.max(1, ...targets.map((region) => region.orders));

  return (
    <g aria-hidden className="pointer-events-none">
      <g fill="none" strokeLinecap="round">
        {targets.map((region, index) => {
          const d = arcPath(hub, regionAnchor(region.code));
          const width = STROKE_MIN + (region.orders / maxOrders) * STROKE_SPAN;
          const delay = 0.3 + index * 0.08;
          return (
            <g key={region.code}>
              <path d={d} className="stroke-gold/20" strokeWidth={width + 1.2} />
              <motion.path
                d={d}
                className="stroke-gold"
                strokeWidth={width}
                initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                transition={{ duration: 1.6, delay, ease: EASE_OUT }}
              />
            </g>
          );
        })}
      </g>

      {targets.map((region) => {
        const { x, y } = regionAnchor(region.code);
        const tone = TONE_CLASS[region.tone];
        return (
          <g key={`node-${region.code}`}>
            <circle cx={x} cy={y} r={3.4} className={cn("stroke-bg", tone.fill)} strokeWidth={1.5} />
          </g>
        );
      })}

      <circle cx={hub.x} cy={hub.y} r={16} className="fill-gold/20" />
      <rect
        x={hub.x - 6}
        y={hub.y - 6}
        width={12}
        height={12}
        rx={2.5}
        transform={`rotate(45 ${hub.x} ${hub.y})`}
        className="fill-gold stroke-bg"
        strokeWidth={2}
      />
    </g>
  );
};
