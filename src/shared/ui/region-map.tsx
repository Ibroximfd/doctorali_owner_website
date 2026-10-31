"use client";

import { motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { isRegionCode } from "@/shared/config/regions";
import {
  UZ_MAP_ARAL,
  UZ_MAP_REGIONS,
  UZ_MAP_VIEWBOX,
  focusScale,
  focusViewBox,
  pointToPercent,
  regionLabelPoint,
} from "@/shared/config/uz-map";
import { cn } from "@/shared/lib/cn";

/** Hudud rangi ma'nosi: ulush chegaralari ERP bilan bir xil (75 · 55 · 35). */
export type RegionTone = "good" | "fair" | "watch" | "bad" | "pending" | "none";

export const regionTone = (rate: number | null, hasOrders: boolean): RegionTone => {
  if (!hasOrders) return "none";
  if (rate === null) return "pending";
  if (rate >= 75) return "good";
  if (rate >= 55) return "fair";
  if (rate >= 35) return "watch";
  return "bad";
};

/** Viloyat maydoni — sahna qorong'i bo'lgani uchun rang yarim shaffof (yoylar va tugunlar ustida o'qiladi). */
const TONE_FILL: Record<RegionTone, string> = {
  good: "fill-good/45",
  fair: "fill-warn/45",
  watch: "fill-serious/45",
  bad: "fill-crit/50",
  pending: "fill-info/40",
  none: "fill-surface-3",
};

/** Bir xil ma'no boshqa elementlarda: tugun (SVG), matn, chegara, fon. */
export const TONE_CLASS: Record<RegionTone, { fill: string; text: string; border: string; bg: string }> = {
  good: { fill: "fill-good", text: "text-good", border: "border-good/40", bg: "bg-good" },
  fair: { fill: "fill-warn", text: "text-warn", border: "border-warn/50", bg: "bg-warn" },
  watch: { fill: "fill-serious", text: "text-serious", border: "border-serious/50", bg: "bg-serious" },
  bad: { fill: "fill-crit", text: "text-crit", border: "border-crit/50", bg: "bg-crit" },
  pending: { fill: "fill-info", text: "text-info", border: "border-info/40", bg: "bg-info" },
  none: { fill: "fill-ink-3", text: "text-ink-3", border: "border-border-strong", bg: "bg-surface-3" },
};

export type MapRegion = {
  code: string;
  name: string;
  tone: RegionTone;
  /** Ekranda va ekran o'quvchida: «91,9% · 1 840 buyurtma». */
  summary: string;
};

type RegionMapProps = {
  regions: readonly MapRegion[];
  selected: string | null;
  onSelect: (code: string | null) => void;
  /** Holat legendasi yorliqlari tartib bilan: good · fair · watch · bad. */
  legend?: Record<"good" | "fair" | "watch" | "bad", string>;
  /**
   * O'z legendasi (ketma-ket shkala, sklad ranglari) — berilsa holat legendasi o'rniga chiziladi.
   * Rang hech qachon yolg'iz signal emas: legenda doim bor.
   */
  legendItems?: ReactNode;
  /**
   * Viloyat maydoni rangi (token utility, masalan `fill-seq-4` yoki `fill-series-2/60`) —
   * berilsa `tone` rangi o'rniga. Ketma-ket (miqdor) va guruh (sklad) xaritalari uchun.
   */
  fillOf?: (code: string) => string | undefined;
  /**
   * Viloyat qaysi guruhga tegishli (masalan sklad id). Sichqoncha bitta viloyat ustida
   * bo'lsa — butun guruh birga ajraladi, qolganlari xiralashadi.
   */
  groupOf?: (code: string) => string | null;
  /** Suzuvchi karta sarlavhasi (sukut — viloyat nomi; guruh xaritasida — guruh nomi). */
  hoverTitle?: (code: string) => string;
  label: string;
  /** Tanlangan viloyatga yaqinlashish (drill-down). */
  zoomed?: boolean;
  /**
   * Xarita ustidagi belgilar (kuryer, ombor) — xarita koordinatalarida (`projectLatLng`).
   * `scale` — yaqinlashganda belgilar ko'zga bir xil kattalikda ko'rinishi uchun ko'paytuvchi.
   */
  overlay?: (scale: number) => ReactNode;
  /**
   * SVG ustidagi HTML qatlam (suzuvchi yorliqlar, sarlavha, HUD) — aynan xarita maydoni
   * ustida turadi; o'rinlar `pointToPercent` bilan foizda beriladi.
   */
  htmlOverlay?: ReactNode;
  /** Legenda oxiridagi qo'shimcha belgilar (markaz, yoylar). */
  legendExtra?: ReactNode;
  /** Sichqoncha ostidagi viloyat kartasi (yorliqlar bor joyda o'chiriladi). */
  hoverCard?: boolean;
  /** Butun xaritada har viloyat nomi doim ko'rinadi (yaqinlashganda yashiriladi). */
  showNames?: boolean;
  /**
   * Butun xaritada sichqoncha ostidagi viloyatning asosiy raqamlari — karta viloyat
   * yonida chiqadi. Berilmasa `summary` qatori ko'rsatiladi.
   */
  hoverDetails?: (code: string) => ReactNode;
};

/** Karta viloyat nuqtasidan qaysi tomonga ochiladi — xarita chetidan chiqib ketmasin. */
const cardPlacement = (left: number, top: number): string =>
  cn(
    left > 68 ? "-translate-x-full -ml-3" : left < 32 ? "ml-3" : "-translate-x-1/2",
    top < 38 ? "mt-4" : "-translate-y-full -mt-4",
  );

/**
 * O'zbekiston choropleth xaritasi: rang — holat (yaxshi → muammo), bosilsa hudud
 * tanlanadi (yana bosilsa bekor). Har viloyat klaviatura bilan ham tanlanadi;
 * rang yolg'iz signal emas — nom va qiymat yonidagi kartada yoziladi.
 */
export const RegionMap = ({
  regions,
  selected,
  onSelect,
  legend,
  label,
  zoomed = false,
  overlay,
  htmlOverlay,
  legendExtra,
  hoverCard = true,
  showNames = false,
  hoverDetails,
  legendItems,
  fillOf,
  groupOf,
  hoverTitle,
}: RegionMapProps) => {
  const reduce = useReducedMotion();
  const [stage, animateStage] = useAnimate<HTMLDivElement>();
  const lastZoom = useRef<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const byCode = new Map(regions.map((region) => [region.code, region]));
  const focus = byCode.get(hovered ?? selected ?? "");

  const zoomCode = zoomed && selected !== null && isRegionCode(selected) ? selected : null;
  const viewBox = zoomCode ? focusViewBox(zoomCode) : UZ_MAP_VIEWBOX;
  const scale = focusScale(zoomCode);
  // Sichqoncha harakatida faqat karta yangilanadi — og'ir SVG qatlam qayta chizilmaydi.
  const overlayLayer = useMemo(() => overlay?.(scale), [overlay, scale]);
  const hoveredShape = !zoomCode && hovered && isRegionCode(hovered) ? hovered : null;
  const hoveredGroup = hoveredShape && groupOf ? groupOf(hoveredShape) : null;

  // yaqinlashish/uzoqlashish paytida xarita qisqa xiralashadi — «kamera fokusi» hissi
  useEffect(() => {
    if (lastZoom.current === zoomCode) return;
    lastZoom.current = zoomCode;
    if (reduce || !stage.current) return;
    void animateStage(
      stage.current,
      { filter: ["blur(0px)", "blur(6px)", "blur(0px)"] },
      { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
    );
  }, [zoomCode, reduce, animateStage, stage]);

  const toggle = (code: string) => onSelect(selected === code ? null : code);
  const onKeyDown = (event: KeyboardEvent<SVGPathElement>, code: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggle(code);
  };

  return (
    <div>
      <div className="relative">
        <div ref={stage}>
          <motion.svg
            viewBox={UZ_MAP_VIEWBOX}
            animate={{ viewBox }}
            transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
            role="group"
            aria-label={label}
            className="h-auto w-full"
          >
            <path
              d={UZ_MAP_ARAL}
              className="fill-info-soft stroke-info/40"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {UZ_MAP_REGIONS.map((shape, index) => {
              const region = byCode.get(shape.code);
              const tone = region?.tone ?? "none";
              const isSelected = selected === shape.code;
              const inHoveredGroup = hoveredGroup !== null && groupOf?.(shape.code) === hoveredGroup;
              const isDimmed = hoveredGroup !== null ? !inHoveredGroup : selected !== null && !isSelected;
              return (
                <motion.path
                  key={shape.code}
                  d={shape.path}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={region ? `${region.name}: ${region.summary}` : shape.code}
                  initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: isDimmed ? 0.4 : 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: reduce ? 0 : index * 0.03 }}
                  onClick={() => toggle(shape.code)}
                  onKeyDown={(event) => onKeyDown(event, shape.code)}
                  onPointerEnter={() => setHovered(shape.code)}
                  onPointerLeave={() => setHovered(null)}
                  className={cn(
                    "art-self stroke-surface focus-visible:stroke-ink hover:stroke-ink/70 cursor-pointer transition-[stroke,opacity] outline-none",
                    fillOf?.(shape.code) ?? TONE_FILL[tone],
                    inHoveredGroup && "stroke-ink",
                    isSelected && "stroke-gold",
                  )}
                  strokeWidth={isSelected ? 3 : 1.2}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            {selected && !zoomCode
              ? UZ_MAP_REGIONS.filter((shape) => shape.code === selected).map((shape) => (
                  <g key={`pin-${shape.code}`} aria-hidden>
                    <circle
                      cx={shape.lx}
                      cy={shape.ly}
                      r={16}
                      className="fill-gold/40 animate-ping-soft art-self"
                    />
                    <circle
                      cx={shape.lx}
                      cy={shape.ly}
                      r={6}
                      className="fill-gold stroke-surface"
                      strokeWidth={2}
                    />
                  </g>
                ))
              : null}
            {overlayLayer ? <g>{overlayLayer}</g> : null}
          </motion.svg>
        </div>

        {htmlOverlay ? <div className="pointer-events-none absolute inset-0">{htmlOverlay}</div> : null}

        {showNames && !zoomCode ? (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {regions.map((region) => {
              if (!isRegionCode(region.code)) return null;
              const { left, top } = pointToPercent(regionLabelPoint(region.code));
              return (
                <span
                  key={region.code}
                  className={cn(
                    "map-label text-3xs md:text-2xs absolute mt-1.5 -translate-x-1/2 font-semibold whitespace-nowrap transition-colors",
                    hoveredShape === region.code ? "text-gold" : "text-ink",
                  )}
                  // o'rin — xarita nuqtasidan hisoblangan foiz (token emas, geometriya)
                  style={{ left: `${left}%`, top: `${top}%` }}
                >
                  {region.name}
                </span>
              );
            })}
          </div>
        ) : null}

        {hoveredShape && hoverDetails ? (
          <HoverCard
            point={pointToPercent(regionLabelPoint(hoveredShape))}
            title={hoverTitle?.(hoveredShape) ?? byCode.get(hoveredShape)?.name ?? hoveredShape}
          >
            {hoverDetails(hoveredShape)}
          </HoverCard>
        ) : hoverCard && focus ? (
          <div className="bg-surface/90 shadow-pop pointer-events-none absolute top-2 left-2 rounded-lg border px-3 py-2">
            <div className="text-sm font-semibold">{focus.name}</div>
            <div className="num text-ink-2 text-xs">{focus.summary}</div>
          </div>
        ) : null}
      </div>

      {legendItems ?? (
        <ul className="text-2xs text-ink-2 mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {legend
            ? (["good", "fair", "watch", "bad"] as const).map((tone) => (
                <li key={tone} className="flex items-center gap-1.5">
                  <span aria-hidden className={cn("size-2.5 rounded-sm", TONE_CLASS[tone].bg)} />
                  {legend[tone]}
                </li>
              ))
            : null}
          {legendExtra}
        </ul>
      )}
    </div>
  );
};

/** Viloyat yonida chiqadigan qisqa karta: nom va asosiy raqamlar. */
const HoverCard = ({
  point,
  title,
  children,
}: {
  point: { left: number; top: number };
  title: string;
  children: ReactNode;
}) => (
  <div
    aria-hidden
    className="pointer-events-none absolute z-10"
    // o'rin — xarita nuqtasidan hisoblangan foiz (token emas, geometriya)
    style={{ left: `${point.left}%`, top: `${point.top}%` }}
  >
    <div
      className={cn(
        "bg-surface shadow-pop animate-in fade-in-0 zoom-in-95 w-56 rounded-xl border px-3.5 py-3 duration-150",
        cardPlacement(point.left, point.top),
      )}
    >
      <div className="font-display text-md leading-tight">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  </div>
);
