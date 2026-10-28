"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useId, useState, type PointerEvent } from "react";

import { CHANNEL_COLOR, seriesBg, type ChannelKey } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import type { Timeseries } from "@/shared/lib/envelope";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { ChartSkeleton, EmptyState, QueryState } from "@/shared/ui/states";

import { useRevenueTrendQuery } from "../hooks/use-overview";
import { stackSeries } from "../model/overview.rules";

const isChannel = (key: string): key is ChannelKey => key in CHANNEL_COLOR;

/** Seriya rangi indeksi → maydon / chiziq / nuqta klassi (Tailwind to'liq nomni ko'rishi kerak). */
const AREA_FILL = [
  "fill-series-1/45",
  "fill-series-2/45",
  "fill-series-3/50",
  "fill-series-4/45",
  "fill-series-5/45",
  "fill-series-6/45",
  "fill-series-7/45",
  "fill-series-8/45",
] as const;
const LINE_STROKE = [
  "stroke-series-1",
  "stroke-series-2",
  "stroke-series-3",
  "stroke-series-4",
  "stroke-series-5",
  "stroke-series-6",
  "stroke-series-7",
  "stroke-series-8",
] as const;
const TEXT = [
  "text-series-1",
  "text-series-2",
  "text-series-3",
  "text-series-4",
  "text-series-5",
  "text-series-6",
  "text-series-7",
  "text-series-8",
] as const;

/** Grafik o'z koordinatalarida (viewBox), ekranga cho'ziladi. */
const W = 860;
const H = 240;
const TOP_PAD = 14;

type Point = { x: number; y: number };

/**
 * Monoton kub egri (d3 `curveMonotoneX` kabi): nuqtalar orasida silliq, lekin qiymatdan
 * oshib ketmaydi — ustma-ust qatlamlar bir-birini kesib o'tmaydi.
 */
const monotonePath = (points: readonly Point[], move = true): string => {
  const n = points.length;
  const first = points[0];
  if (!first) return "";
  const head = `${move ? "M" : "L"} ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  if (n < 2) return head;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    slopes.push(b.x === a.x ? 0 : (b.y - a.y) / (b.x - a.x));
  }
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0] ?? 0;
    if (i === n - 1) return slopes[n - 2] ?? 0;
    const left = slopes[i - 1] ?? 0;
    const right = slopes[i] ?? 0;
    return left * right <= 0 ? 0 : (left + right) / 2;
  });
  // Fritsch–Carlson: tangenslar qiyalikdan 3 barobardan oshmaydi
  for (let i = 0; i < n - 1; i += 1) {
    const slope = slopes[i] ?? 0;
    if (slope === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = (tangents[i] ?? 0) / slope;
    const b = (tangents[i + 1] ?? 0) / slope;
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      tangents[i] = k * a * slope;
      tangents[i + 1] = k * b * slope;
    }
  }
  let d = head;
  for (let i = 0; i < n - 1; i += 1) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    const dx = (b.x - a.x) / 3;
    const c1 = { x: a.x + dx, y: a.y + (tangents[i] ?? 0) * dx };
    const c2 = { x: b.x - dx, y: b.y - (tangents[i + 1] ?? 0) * dx };
    d += ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
};

/** «Pul oqimi» — tushum kanallar bo'yicha ustma-ust maydon grafigi, «Bugun» belgisi bilan. */
export const RevenueRiver = ({ className }: { className?: string }) => {
  const t = useTranslations("overview");
  const query = useRevenueTrendQuery();
  const series = query.data?.data.series ?? [];

  return (
    <Card className={className}>
      <CardHeader
        title={t("river.title")}
        description={t("river.description")}
        action={
          series.length > 1 ? (
            <ul className="text-ink-2 hidden flex-wrap justify-end gap-x-3 gap-y-1 text-xs sm:flex">
              {series.map((item, index) => (
                <li key={item.key} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 rounded-xs",
                      seriesBg(isChannel(item.key) ? CHANNEL_COLOR[item.key] : index),
                    )}
                  />
                  {isChannel(item.key) ? t(`channels.${item.key}`) : item.key}
                </li>
              ))}
            </ul>
          ) : null
        }
      />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ChartSkeleton />}
          isEmpty={({ data }) =>
            data.labels.length === 0 || data.series.every((item) => item.values.every((v) => v <= 0))
          }
          empty={<EmptyState />}
        >
          {({ data, period }) => <River data={data} granularity={period.granularity} />}
        </QueryState>
      </CardBody>
    </Card>
  );
};

type Granularity = Parameters<ReturnType<typeof useFormat>["bucket"]>[1];

const River = ({ data, granularity }: { data: Timeseries; granularity: Granularity }) => {
  const t = useTranslations("overview");
  const format = useFormat();
  const reduce = useReducedMotion();
  const clipId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const n = data.labels.length;
  const stacked = stackSeries(data.series);
  const top = stacked[stacked.length - 1] ?? [];
  const max = Math.max(1, ...top);
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (value: number) => H - (value / max) * (H - TOP_PAD);
  const colorOf = (key: string, index: number) => (isChannel(key) ? CHANNEL_COLOR[key] : index) % 8;

  const layers = data.series.map((item, index) => {
    const upper = (stacked[index] ?? []).map((value, i) => ({ x: x(i), y: y(value) }));
    const lower = (
      index === 0
        ? upper.map((point) => ({ x: point.x, y: H }))
        : (stacked[index - 1] ?? []).map((value, i) => ({ x: x(i), y: y(value) }))
    ).reverse();
    return {
      key: item.key,
      color: colorOf(item.key, index),
      area: `${monotonePath(upper)} ${monotonePath(lower, false)} Z`,
      line: monotonePath(upper),
    };
  });

  const focus = hover ?? n - 1;
  const focusLeft = (x(focus) / W) * 100;
  const label = (i: number) => format.bucket(data.labels[i] ?? "", granularity);
  const total = top.reduce((sum, value) => sum + value, 0);
  const nameOf = (key: string) => (isChannel(key) ? t(`channels.${key}`) : key);

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const share = (event.clientX - box.left) / box.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(share * (n - 1)))));
  };

  return (
    <div>
      <div className="relative" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <svg
          role="img"
          aria-label={t("river.chartLabel", {
            first: label(0),
            last: label(n - 1),
            total: format.moneyCompact(total),
          })}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-52 w-full md:h-64"
        >
          <defs>
            <clipPath id={clipId}>
              <motion.rect
                x={0}
                y={0}
                height={H}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: W }}
                transition={{ duration: 1.6, ease: EASE_OUT }}
              />
            </clipPath>
          </defs>
          {[0.25, 0.5, 0.75].map((share) => (
            <line
              key={share}
              x1={0}
              x2={W}
              y1={H - share * (H - TOP_PAD)}
              y2={H - share * (H - TOP_PAD)}
              className="stroke-grid"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <g clipPath={`url(#${clipId})`}>
            {layers.map((layer) => (
              <path key={`a-${layer.key}`} d={layer.area} className={AREA_FILL[layer.color]} />
            ))}
            {layers.map((layer) => (
              <path
                key={`l-${layer.key}`}
                d={layer.line}
                fill="none"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
                className={LINE_STROKE[layer.color]}
              />
            ))}
          </g>
          <line
            x1={x(focus)}
            x2={x(focus)}
            y1={TOP_PAD / 2}
            y2={H}
            className="stroke-ink/40"
            strokeDasharray="2 4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* nuqta HTML da — `preserveAspectRatio="none"` doirani cho'zib yubormasin */}
        <span
          aria-hidden
          className="border-accent bg-ink pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          // o'rin — fokusdagi kunning yuqori nuqtasi (foizda)
          style={{ left: `${focusLeft}%`, top: `${(y(top[focus] ?? 0) / H) * 100}%` }}
        />
        <div
          aria-hidden
          className={cn(
            "bg-bg/90 shadow-pop pointer-events-none absolute top-1 rounded-xl border px-3 py-2 text-xs whitespace-nowrap",
            focusLeft > 60 ? "-ml-3 -translate-x-full" : "ml-3",
          )}
          // tooltip fokus chizig'i yonida
          style={{ left: `${focusLeft}%` }}
        >
          <div className="text-ink-2">
            {hover === null ? `${t("river.today")} · ${label(focus)}` : label(focus)}
          </div>
          <div className="num mt-1 flex gap-3">
            {data.series.map((item, index) => (
              <span key={item.key} className={TEXT[colorOf(item.key, index)]}>
                {format.moneyCompact(item.values[focus] ?? 0)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div aria-hidden className="num text-2xs text-ink-3 mt-1.5 flex justify-between">
        <span>{label(0)}</span>
        {n > 2 ? <span>{label(Math.floor((n - 1) / 2))}</span> : null}
        <span>{label(n - 1)}</span>
      </div>

      {/* grafikning to'liq matn egizagi — ekran o'quvchi uchun */}
      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">{t("river.title")}</th>
            {data.series.map((item) => (
              <th key={item.key} scope="col">
                {nameOf(item.key)}
              </th>
            ))}
            <th scope="col">{t("river.total")}</th>
          </tr>
        </thead>
        <tbody>
          {data.labels.map((bucket, i) => (
            <tr key={bucket}>
              <th scope="row">{label(i)}</th>
              {data.series.map((item) => (
                <td key={item.key}>{format.money(item.values[i] ?? 0)}</td>
              ))}
              <td>{format.money(top[i] ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
