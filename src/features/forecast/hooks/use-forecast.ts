"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsNumberLiteral, useQueryState } from "nuqs";

import {
  loadForecastRegions,
  loadForecastSeries,
  loadForecastSummary,
  loadStockouts,
} from "../api/forecast.api";
import { HORIZONS, type ForecastMetric, type Horizon } from "../model/forecast.rules";

/** Prognoz kechasi bir marta hisoblanadi — soatlab kesh yetarli. */
const STALE_MS = 30 * 60_000;

/** Ufq URL da (`?horizon=7|30|90`), default — 30 kun. */
export const useHorizon = () => {
  const [horizon, setHorizon] = useQueryState("horizon", parseAsNumberLiteral(HORIZONS).withDefault(30));
  return { horizon, setHorizon: (value: Horizon) => void setHorizon(value === 30 ? null : value) };
};

export const forecastKeys = {
  all: ["forecast"] as const,
  summary: (horizon: Horizon) => [...forecastKeys.all, "summary", horizon] as const,
  series: (horizon: Horizon, metric: ForecastMetric) =>
    [...forecastKeys.all, "series", horizon, metric] as const,
  stockouts: (horizon: Horizon) => [...forecastKeys.all, "stockouts", horizon] as const,
  regions: (horizon: Horizon) => [...forecastKeys.all, "regions", horizon] as const,
};

const options = { staleTime: STALE_MS, placeholderData: <T>(previous: T | undefined) => previous };

export const useForecastSummaryQuery = () => {
  const { horizon } = useHorizon();
  return useQuery({
    queryKey: forecastKeys.summary(horizon),
    queryFn: () => loadForecastSummary({ horizon }),
    ...options,
  });
};

export const useForecastSeriesQuery = (metric: ForecastMetric) => {
  const { horizon } = useHorizon();
  return useQuery({
    queryKey: forecastKeys.series(horizon, metric),
    queryFn: () => loadForecastSeries({ horizon }, metric),
    ...options,
  });
};

export const useStockoutsQuery = () => {
  const { horizon } = useHorizon();
  return useQuery({
    queryKey: forecastKeys.stockouts(horizon),
    queryFn: () => loadStockouts({ horizon }),
    ...options,
  });
};

export const useForecastRegionsQuery = () => {
  const { horizon } = useHorizon();
  return useQuery({
    queryKey: forecastKeys.regions(horizon),
    queryFn: () => loadForecastRegions({ horizon }),
    ...options,
  });
};
