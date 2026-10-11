"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { toChartRows, type ChartData } from "./chart-data";
import { ChartTooltip } from "./chart-tooltip";
import { AXIS_LINE, AXIS_TICK, CHART_MARGIN, Y_AXIS_WIDTH } from "./chart-style";

export type ColumnChartProps = {
  data: ChartData;
  formatValue: (value: number) => string;
  formatAxis?: (value: number) => string;
  totalLabel?: string;
  ariaLabel: string;
};

const MAX_BAR_WIDTH = 24;
const TOP_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

/**
 * Ustunlar (ustma-ust): eni ≤ 24px, faqat ustki uchi yumaloq, bo'laklar orasi
 * fon rangidagi 2px bo'shliq. Hover — butun ustun guruhi uchun bitta tooltip.
 */
export const ColumnChart = ({ data, formatValue, formatAxis, totalLabel, ariaLabel }: ColumnChartProps) => {
  const rows = toChartRows(data);
  const lastSeries = data.series.length - 1;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={rows}
        margin={CHART_MARGIN}
        accessibilityLayer
        aria-label={ariaLabel}
        barCategoryGap="28%"
      >
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
          cursor={{ fill: "var(--ink)", fillOpacity: 0.06 }}
          content={<ChartTooltip formatValue={formatValue} totalLabel={totalLabel} marker="box" />}
        />
        {data.series.map((series, index) => (
          <Bar
            key={series.key}
            dataKey={series.key}
            name={series.name}
            stackId="stack"
            fill={series.color}
            stroke="var(--surface)"
            strokeWidth={data.series.length > 1 ? 1 : 0}
            maxBarSize={MAX_BAR_WIDTH}
            radius={index === lastSeries ? TOP_RADIUS : undefined}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
