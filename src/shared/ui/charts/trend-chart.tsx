"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { COMPARE_KEY, toChartRows, type ChartData } from "./chart-data";
import { ChartTooltip } from "./chart-tooltip";
import { AXIS_LINE, AXIS_TICK, CHART_MARGIN, Y_AXIS_WIDTH } from "./chart-style";

export type TrendChartProps = {
  data: ChartData;
  formatValue: (value: number) => string;
  /** O'q yorliqlari uchun qisqaroq format (berilmasa `formatValue`). */
  formatAxis?: (value: number) => string;
  /** Tooltipda seriyalar yig'indisi (qo'shiladigan seriyalar uchun). */
  totalLabel?: string;
  ariaLabel: string;
};

type DotProps = { cx?: number; cy?: number; index?: number };

/**
 * Vaqt bo'yicha trend: 2px chiziq, bitta o'q, sust to'r. Oxirgi nuqta urg'uda;
 * hover/klaviatura bilan vertikal chiziq hamma seriya qiymatini ko'rsatadi.
 */
export const TrendChart = ({ data, formatValue, formatAxis, totalLabel, ariaLabel }: TrendChartProps) => {
  const rows = toChartRows(data);
  const lastIndex = rows.length - 1;
  const fillsArea = data.series.length === 1 || data.series.some((series) => series.area);

  const endDot = (color: string) => {
    const EndDot = ({ cx, cy, index }: DotProps) =>
      index === lastIndex && cx !== undefined && cy !== undefined ? (
        <circle
          key={`end-${index}`}
          cx={cx}
          cy={cy}
          r={4}
          fill={color}
          stroke="var(--surface)"
          strokeWidth={2}
        />
      ) : (
        <g key={`dot-${index}`} />
      );
    return EndDot;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={CHART_MARGIN} accessibilityLayer aria-label={ariaLabel}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={AXIS_LINE}
          interval="preserveStartEnd"
          minTickGap={28}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={Y_AXIS_WIDTH}
          tickFormatter={formatAxis ?? formatValue}
          tickCount={5}
        />
        <Tooltip
          cursor={{ stroke: "var(--ink-3)", strokeWidth: 1 }}
          content={<ChartTooltip formatValue={formatValue} totalLabel={totalLabel} marker="line" />}
        />
        {data.compare ? (
          <Line
            dataKey={COMPARE_KEY}
            name={data.compare.name}
            stroke="var(--cmp)"
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        ) : null}
        {fillsArea
          ? data.series
              .filter((series) => series.area || data.series.length === 1)
              .map((series) => (
                <Area
                  key={`area-${series.key}`}
                  dataKey={series.key}
                  stroke="none"
                  fill={series.color}
                  fillOpacity={0.1}
                  tooltipType="none"
                  legendType="none"
                  activeDot={false}
                  isAnimationActive={false}
                />
              ))
          : null}
        {data.series.map((series) => (
          <Line
            key={series.key}
            dataKey={series.key}
            name={series.name}
            stroke={series.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={endDot(series.color)}
            activeDot={{ r: 4.5, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
};
