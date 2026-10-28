import { parseEnvelope, type Envelope } from "@/shared/lib/envelope";
import { apiGet } from "@/shared/lib/http";

import type { ForecastMetric, Horizon } from "../model/forecast.rules";
import {
  forecastRegionsSchema,
  forecastSeriesSchema,
  forecastSummarySchema,
  stockoutsSchema,
  type ForecastRegion,
  type ForecastSeries,
  type ForecastSummary,
  type Stockout,
} from "../model/forecast.schema";

/** Prognoz davr va filial filtrini olmaydi (butun biznes) — faqat ufq. */
type ForecastParams = { horizon: Horizon };

export const loadForecastSummary = async (params: ForecastParams): Promise<Envelope<ForecastSummary>> =>
  parseEnvelope(forecastSummarySchema, await apiGet("forecast/summary/", params));

export const loadForecastSeries = async (
  params: ForecastParams,
  metric: ForecastMetric,
): Promise<Envelope<ForecastSeries>> =>
  parseEnvelope(forecastSeriesSchema, await apiGet("forecast/timeseries/", { ...params, metric }));

export const loadStockouts = async (params: ForecastParams): Promise<Envelope<Stockout[]>> =>
  parseEnvelope(stockoutsSchema, await apiGet("forecast/stockouts/", params));

export const loadForecastRegions = async (params: ForecastParams): Promise<Envelope<ForecastRegion[]>> =>
  parseEnvelope(forecastRegionsSchema, await apiGet("forecast/regions/", params));
