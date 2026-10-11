import {
  parseEnvelope,
  parseJson,
  timeseriesSchema,
  type Envelope,
  type Timeseries,
} from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";

import { feedSchema, overviewSchema, type FeedEvent, type Overview } from "../model/overview.schema";

export const loadOverview = async (params: QueryParams): Promise<Envelope<Overview>> =>
  parseEnvelope(overviewSchema, await apiGet("overview/", params));

/** Tushum trendi, kanallar bo'yicha. */
export const loadRevenueTrend = async (params: QueryParams): Promise<Envelope<Timeseries>> =>
  parseEnvelope(
    timeseriesSchema,
    await apiGet("overview/timeseries/", { ...params, metric: "revenue", split: "channel" }),
  );

export const loadFeed = async (limit: number): Promise<FeedEvent[]> =>
  parseJson(feedSchema, await apiGet("feed/", { limit })).results;
