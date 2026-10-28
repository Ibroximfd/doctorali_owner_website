import { parseEnvelope, type Envelope } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";

import {
  agingSchema,
  b2bSchema,
  regionSettlementsSchema,
  settlementsSummarySchema,
  type Aging,
  type B2bClient,
  type RegionSettlement,
  type SettlementsSummary,
} from "../model/settlements.schema";

export const loadSettlementsSummary = async (params: QueryParams): Promise<Envelope<SettlementsSummary>> =>
  parseEnvelope(settlementsSummarySchema, await apiGet("settlements/summary/", params));

export const loadRegionSettlements = async (params: QueryParams): Promise<Envelope<RegionSettlement[]>> =>
  parseEnvelope(regionSettlementsSchema, await apiGet("settlements/regions/", params));

export const loadAging = async (params: QueryParams): Promise<Envelope<Aging>> =>
  parseEnvelope(agingSchema, await apiGet("settlements/aging/", params));

export const loadB2b = async (params: QueryParams): Promise<Envelope<B2bClient[]>> => {
  const envelope = parseEnvelope(b2bSchema, await apiGet("settlements/b2b/", params));
  return { ...envelope, data: envelope.data.results };
};
