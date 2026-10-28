"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useMemo, useState, type PointerEvent } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Segmented } from "@/shared/ui/segmented";
import { ChartSkeleton, QueryState } from "@/shared/ui/states";

import { useElementSize } from "../hooks/use-element-size";
import { useForecastSeriesQuery } from "../hooks/use-forecast";
import type { ForecastMetric } from "../model/forecast.rules";
import type { ForecastSeries } from "../model/forecast.schema";
import { buildForecastGeometry } from "./forecast-geometry";

/** O'lchab bo'lmaguncha (birinchi kadr, test muhiti) grafik shu o'lchamda chiziladi. */
const FALLBACK_BOX = { width: 720, height: 300 };
/** Izoh plitkasi kengligi — `w-36` (9rem) bilan bir xil, chetdan chiqmasligi uchun. */
const TILE_WIDTH = 144;
/** Shundan tor ekranda faqat bitta izoh (ufq oxiri) qoladi. */
const NARROW = 480;

type CanvasProps = {
  series: ForecastSeries;
  formatValue: (value: number) => string;
  title: string;
};

const clampTile = (x: number, width: number) => Math.min(Math.max(x - TILE_WIDTH / 2, 0), width - TILE_WIDTH);

/**
 * Fakt chizig'i chiziladi, «bugun» nuqtasi pulslaydi, keyin prognoz shtrixi va ikki qatlamli
 * ishonch konusi (80% / 50%) chapdan o'ngga ochiladi. Muhim nuqtalarda izoh plitkalari.
 */
const ForecastCanvas = ({ series, formatValue, title }: CanvasProps) => {
  const t = useTranslations("forecast.chart");
  const format = useFormat();
  const reduce = useReducedMotion();
  const [ref, box] = useElementSize<HTMLDivElement>(FALLBACK_BOX);
  const [hover, setHover] = useState<number | null>(null);
  const geometry = useMemo(() => buildForecastGeometry(series, box), [series, box]);
  const { plot, today, peak, end } = geometry;
  const labelOf = (index: number) => format.bucket(series.labels[index] ?? "", "day");

  const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (bounds) setHover(geometry.indexAt(event.clientX - bounds.left));
  };

  const hoverX = hover === null ? null : geometry.xOf(hover);
  const hoverActual = hover === null ? null : (series.actual[hover] ?? null);
  const hoverForecast =
    hover === null || hover <= series.todayIndex ? null : (series.forecast[hover] ?? null);
  const hoverLow = hover === null ? null : (series.low[hover] ?? null);
  const hoverHigh = hover === null ? null : (series.high[hover] ?? null);

  const fan = reduce
    ? {}
    : {
        initial: { clipPath: "inset(0 100% 0 0)" },
        animate: { clipPath: "inset(0 0% 0 0)" },
        transition: { duration: 1.4, delay: 1.1, ease: EASE_OUT },
      };

  const tiles = [
    end
      ? {
          key: "end",
          point: end,
          label: t("expectedOn", { date: labelOf(end.index) }),
          value: formatValue(end.value),
          tone: "border-accent/40 text-mint",
          delay: 2,
        }
      : null,
    peak && box.width >= NARROW
      ? {
          key: "peak",
          point: peak,
          label: t("peakOn", { date: labelOf(peak.index) }),
          value: formatValue(peak.value),
          tone: "border-gold/40 text-gold",
          delay: 1.8,
        }
      : null,
  ].filter((tile) => tile !== null);

  return (
    <div ref={ref} className="relative h-64 md:h-80">
      <svg
        role="img"
        aria-label={title}
        width={box.width}
        height={box.height}
        className="absolute inset-0 overflow-visible"
      >
        <g className="stroke-grid">
          {geometry.ticks.map((tick) => (
            <line key={tick.value} x1={plot.left} x2={plot.right} y1={tick.y} y2={tick.y} />
          ))}
        </g>
        <g className="fill-ink-3 num text-2xs">
          {geometry.ticks.map((tick) => (
            <text key={tick.value} x={plot.left - 8} y={tick.y} dy="0.32em" textAnchor="end">
              {formatValue(tick.value)}
            </text>
          ))}
          {geometry.xLabels.map((label) => (
            <text key={label.index} x={label.x} y={plot.bottom + 20} textAnchor={label.anchor}>
              {label.index === series.todayIndex ? t("today") : labelOf(label.index)}
            </text>
          ))}
        </g>

        <motion.g {...fan}>
          <path d={geometry.outerBand} className="fill-accent/10" />
          <path d={geometry.innerBand} className="fill-accent/20" />
          <path
            d={geometry.forecastPath}
            fill="none"
            strokeWidth={2.4}
            strokeDasharray="6 6"
            strokeLinecap="round"
            className="stroke-accent"
          />
        </motion.g>

        <motion.path
          d={geometry.actualPath}
          fill="none"
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-ink"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: EASE_OUT }}
        />

        {today ? (
          <g>
            <line
              x1={today.x}
              x2={today.x}
              y1={plot.top}
              y2={plot.bottom}
              strokeDasharray="3 5"
              className="stroke-gold/50"
            />
            {reduce ? null : (
              <motion.circle
                cx={today.x}
                cy={today.y}
                r={6}
                className="fill-gold"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2.6, opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <circle cx={today.x} cy={today.y} r={5} className="fill-gold stroke-bg" strokeWidth={2} />
          </g>
        ) : null}

        {hoverX !== null ? (
          <line x1={hoverX} x2={hoverX} y1={plot.top} y2={plot.bottom} className="stroke-ink-3" />
        ) : null}
        <rect
          x={plot.left}
          y={plot.top}
          width={plot.right - plot.left}
          height={plot.bottom - plot.top}
          fill="transparent"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>

      {tiles.map((tile) => {
        const below = tile.point.y < box.height / 2;
        return (
          <motion.div
            key={tile.key}
            aria-hidden
            initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: tile.delay, ease: EASE_OUT }}
            // joylashuv grafik nuqtasidan hisoblanadi — token bilan ifodalab bo'lmaydi
            style={{ left: clampTile(tile.point.x, box.width), top: tile.point.y }}
            className={cn(
              "bg-bg/90 pointer-events-none absolute w-36 rounded-xl border px-3 py-2",
              below ? "mt-4" : "-mt-4 -translate-y-full",
              tile.tone,
            )}
          >
            <div className="text-2xs text-ink-2">{tile.label}</div>
            <div className="num mt-0.5 text-sm font-semibold">{tile.value}</div>
          </motion.div>
        );
      })}

      {hover !== null && hoverX !== null ? (
        <div
          role="status"
          // kursor ostidagi kun — joylashuvi hisoblanadi
          style={{ left: clampTile(hoverX, box.width), top: plot.top }}
          className="bg-surface shadow-pop pointer-events-none absolute w-36 rounded-lg border px-3 py-2 text-xs"
        >
          <div className="mb-1 font-semibold">{labelOf(hover)}</div>
          {hoverActual !== null ? (
            <div className="flex justify-between gap-3">
              <span className="text-ink-2">{t("actual")}</span>
              <span className="num font-semibold">{formatValue(hoverActual)}</span>
            </div>
          ) : null}
          {hoverForecast !== null ? (
            <div className="flex justify-between gap-3">
              <span className="text-ink-2">{t("forecast")}</span>
              <span className="num font-semibold">{formatValue(hoverForecast)}</span>
            </div>
          ) : null}
          {hoverForecast !== null && hoverLow !== null && hoverHigh !== null ? (
            <div className="text-ink-3 num mt-0.5">
              {t("range", { low: formatValue(hoverLow), high: formatValue(hoverHigh) })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

/** Tarix + ufq: fakt, prognoz va ishonch konusi. Ko'rsatkich — tushum yoki buyurtma. */
export const ForecastChart = ({ className }: { className?: string }) => {
  const t = useTranslations("forecast.chart");
  const format = useFormat();
  const [metric, setMetric] = useState<ForecastMetric>("revenue");
  const query = useForecastSeriesQuery(metric);
  const formatValue = metric === "revenue" ? format.moneyCompact : formatNumber;
  const title = metric === "revenue" ? t("titleRevenue") : t("titleOrders");

  return (
    <Card className={className}>
      <CardHeader
        title={title}
        description={t("description")}
        action={
          <Segmented
            ariaLabel={t("metric")}
            value={metric}
            onChange={setMetric}
            options={[
              { value: "revenue", label: t("revenue") },
              { value: "orders", label: t("orders") },
            ]}
          />
        }
      />
      <CardBody>
        <QueryState query={query} skeleton={<ChartSkeleton />}>
          {({ data }) => (
            <>
              <ForecastCanvas series={data} formatValue={formatValue} title={title} />
              <ul className="text-2xs text-ink-2 mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                <li className="flex items-center gap-1.5">
                  <span aria-hidden className="bg-ink h-0.5 w-3.5 rounded-full" />
                  {t("actual")}
                </li>
                <li className="flex items-center gap-1.5">
                  <span aria-hidden className="border-accent w-3.5 border-t-2 border-dashed" />
                  {t("forecast")}
                </li>
                <li className="flex items-center gap-1.5">
                  <span aria-hidden className="bg-accent/20 h-2 w-3.5 rounded-sm" />
                  {t("band50")}
                </li>
                <li className="flex items-center gap-1.5">
                  <span aria-hidden className="bg-accent/10 h-2 w-3.5 rounded-sm" />
                  {t("band")}
                </li>
              </ul>
            </>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
