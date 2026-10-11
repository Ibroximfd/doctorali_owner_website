"use client";

import dynamic from "next/dynamic";

import { ChartSkeleton } from "../states/skeletons";

/**
 * Recharts faqat brauzerda va faqat kerak bo'lganda yuklanadi — panelning
 * birinchi bo'yog'iga og'irlik qo'shmaydi.
 */
export const TrendChart = dynamic(() => import("./trend-chart").then((module) => module.TrendChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-full" />,
});

export const ColumnChart = dynamic(() => import("./column-chart").then((module) => module.ColumnChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-full" />,
});

export { chartTotals, isChartEmpty, toChartTable, type ChartData, type ChartSeries } from "./chart-data";
