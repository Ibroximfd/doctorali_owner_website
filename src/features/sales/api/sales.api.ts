import { parseEnvelope, type Envelope } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";

import {
  leadSourcesSchema,
  leadsFunnelSchema,
  operatorDetailSchema,
  operatorsSchema,
  salesCallsSchema,
  salesFilialsSchema,
  salesFilialsTrendSchema,
  salesRatingsSchema,
  salesSummarySchema,
  type LeadSource,
  type LeadStatus,
  type Operator,
  type OperatorDetail,
  type SalesCalls,
  type SalesFilial,
  type SalesFilialsTrend,
  type SalesRatings,
  type SalesSummary,
} from "../model/sales.schema";

export const loadSalesSummary = async (params: QueryParams): Promise<Envelope<SalesSummary>> =>
  parseEnvelope(salesSummarySchema, await apiGet("sales/summary/", params));

export const loadOperators = async (params: QueryParams): Promise<Envelope<Operator[]>> =>
  parseEnvelope(operatorsSchema, await apiGet("sales/operators/", params));

export const loadOperator = async (id: number, params: QueryParams): Promise<Envelope<OperatorDetail>> =>
  parseEnvelope(operatorDetailSchema, await apiGet(`sales/operators/${id}/`, params));

export const loadLeadsFunnel = async (params: QueryParams): Promise<Envelope<LeadStatus[]>> =>
  parseEnvelope(leadsFunnelSchema, await apiGet("sales/leads-funnel/", params));

export const loadLeadSources = async (params: QueryParams): Promise<Envelope<LeadSource[]>> =>
  parseEnvelope(leadSourcesSchema, await apiGet("sales/lead-sources/", params));

export const loadSalesCalls = async (params: QueryParams): Promise<Envelope<SalesCalls>> =>
  parseEnvelope(salesCallsSchema, await apiGet("sales/calls/", params));

export const loadSalesRatings = async (params: QueryParams): Promise<Envelope<SalesRatings>> =>
  parseEnvelope(salesRatingsSchema, await apiGet("sales/ratings/", params));

/** Operator jamoalari filial kesimida. `params` da filial filtri bo'lmasligi kerak — ro'yxat har doim to'liq. */
export const loadSalesFilials = async (params: QueryParams): Promise<Envelope<SalesFilial[]>> =>
  parseEnvelope(salesFilialsSchema, await apiGet("sales/filials/", params));

export const loadSalesFilialsTrend = async (params: QueryParams): Promise<Envelope<SalesFilialsTrend>> =>
  parseEnvelope(salesFilialsTrendSchema, await apiGet("sales/filials/timeseries/", params));
