"use client";

import { useReducedMotion } from "motion/react";

import { arcPath, projectLatLng } from "@/shared/config/uz-map";
import { cn } from "@/shared/lib/cn";

import { isCourierStatus, type CourierStatus } from "../model/regions.rules";
import type { RegionCourier, RegionWarehouse } from "../model/regions.schema";

const COURIER_FILL: Record<CourierStatus, string> = {
  moving: "fill-good",
  idle: "fill-warn",
  no_signal: "fill-crit",
  off_shift: "fill-ink-3",
};

type MarkersProps = {
  couriers: readonly RegionCourier[];
  warehouses: readonly RegionWarehouse[];
  scale: number;
  activeCourier: number | null;
};

/**
 * Viloyat xaritasi ustidagi belgilar: omborlar — tilla kvadrat, kuryerlar — holat rangidagi nuqta
 * (harakatdagida yo'nalish o'qi, signal yo'qda puls). Ro'yxatdagi tanlangan kuryer kattalashadi.
 * Ombordan vazifadagi kuryerlarga yo'l chiziladi: ustida shtrix oqadi, harakatdagi kuryer
 * yo'nalishida nuqta yuguradi. Faqat ko'rinish — xuddi shu ma'lumot yon panelda matn bilan bor.
 */
export const RegionMarkers = ({ couriers, warehouses, scale, activeCourier }: MarkersProps) => {
  const reduce = useReducedMotion();
  const base = warehouses.find((warehouse) => warehouse.lat !== null && warehouse.lng !== null);
  const origin = base?.lat != null && base.lng != null ? projectLatLng(base.lat, base.lng) : null;

  return (
    <g aria-hidden>
      {origin
        ? couriers.map((courier) => {
            if (courier.lat === null || courier.lng === null || courier.task === null) return null;
            const status = isCourierStatus(courier.status) ? courier.status : null;
            if (status === "off_shift") return null;
            const d = arcPath(origin, projectLatLng(courier.lat, courier.lng));
            const lost = status === "no_signal";
            return (
              <g key={`route-${courier.id}`} fill="none" strokeLinecap="round">
                <path
                  d={d}
                  className={lost ? "stroke-crit/40" : "stroke-good/35"}
                  strokeWidth={2.4}
                  strokeDasharray={lost ? "2 5" : undefined}
                  vectorEffect="non-scaling-stroke"
                />
                {reduce || lost ? null : (
                  <>
                    <path
                      d={d}
                      className="stroke-mint animate-dash"
                      strokeWidth={2}
                      strokeDasharray="3 9"
                      vectorEffect="non-scaling-stroke"
                    />
                    {status === "moving" ? (
                      <circle r={2.2 * scale} className="fill-good stroke-ink" strokeWidth={0.5 * scale}>
                        <animateMotion dur="7s" repeatCount="indefinite" path={d} />
                      </circle>
                    ) : null}
                  </>
                )}
              </g>
            );
          })
        : null}
      {warehouses.map((warehouse) => {
        if (warehouse.lat === null || warehouse.lng === null) return null;
        const { x, y } = projectLatLng(warehouse.lat, warehouse.lng);
        const size = 9 * scale;
        return (
          <g key={`w-${warehouse.id}`}>
            <title>{warehouse.name}</title>
            {reduce ? null : (
              <circle cx={x} cy={y} r={size} className="fill-gold/30 animate-breathe art-self" />
            )}
            <rect
              x={x - size / 2}
              transform={`rotate(45 ${x} ${y})`}
              y={y - size / 2}
              width={size}
              height={size}
              rx={2 * scale}
              className="fill-gold stroke-surface"
              strokeWidth={1.5 * scale}
            />
            <rect
              x={x - size / 5}
              y={y - size / 5}
              width={(size * 2) / 5}
              height={(size * 2) / 5}
              transform={`rotate(45 ${x} ${y})`}
              className="fill-forest"
            />
          </g>
        );
      })}
      {couriers.map((courier) => {
        if (courier.lat === null || courier.lng === null) return null;
        const { x, y } = projectLatLng(courier.lat, courier.lng);
        const status = isCourierStatus(courier.status) ? courier.status : null;
        const isActive = courier.id === activeCourier;
        const r = (isActive ? 6 : 4) * scale;
        return (
          <g key={`c-${courier.id}`}>
            <title>{courier.fullName}</title>
            {(status === "no_signal" || isActive) && !reduce ? (
              <circle
                cx={x}
                cy={y}
                r={r * 2.4}
                className={cn(
                  "animate-ping-soft art-self opacity-50",
                  status ? COURIER_FILL[status] : "fill-ink-3",
                )}
              />
            ) : null}
            {status === "moving" && courier.heading !== null ? (
              <path
                d={`M ${x} ${y - r * 2.4} L ${x - r * 0.9} ${y - r * 1.1} L ${x + r * 0.9} ${y - r * 1.1} Z`}
                transform={`rotate(${courier.heading} ${x} ${y})`}
                className="fill-good"
              />
            ) : null}
            <circle
              cx={x}
              cy={y}
              r={r}
              className={cn(
                status ? COURIER_FILL[status] : "fill-ink-3",
                isActive ? "stroke-ink" : "stroke-surface",
              )}
              strokeWidth={1.5 * scale}
            />
          </g>
        );
      })}
    </g>
  );
};
