import { parseEnvelope, timeseriesSchema, type Envelope, type Timeseries } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";

import {
  attemptReasonsSchema,
  courierDetailSchema,
  couriersSchema,
  handoversSchema,
  liveSchema,
  logisticsSummarySchema,
  regionDeliverySchema,
  transfersSchema,
  type AttemptReason,
  type Courier,
  type CourierDetail,
  type Handovers,
  type LiveBoard,
  type LogisticsSummary,
  type RegionDelivery,
  type Transfer,
} from "../model/logistics.schema";

export const loadLogisticsSummary = async (params: QueryParams): Promise<Envelope<LogisticsSummary>> =>
  parseEnvelope(logisticsSummarySchema, await apiGet("logistics/summary/", params));

export const loadCouriers = async (params: QueryParams): Promise<Envelope<Courier[]>> =>
  parseEnvelope(couriersSchema, await apiGet("logistics/couriers/", params));

export const loadCourier = async (id: number, params: QueryParams): Promise<Envelope<CourierDetail>> =>
  parseEnvelope(courierDetailSchema, await apiGet(`logistics/couriers/${id}/`, params));

/** Kunlik yetkazish: `delivered`, `cancelled`, `attempts` seriyalari. */
export const loadDeliveryTimeseries = async (params: QueryParams): Promise<Envelope<Timeseries>> =>
  parseEnvelope(timeseriesSchema, await apiGet("logistics/timeseries/", params));

export const loadRegionDelivery = async (params: QueryParams): Promise<Envelope<RegionDelivery[]>> =>
  parseEnvelope(regionDeliverySchema, await apiGet("logistics/regions/", params));

export const loadAttemptReasons = async (params: QueryParams): Promise<Envelope<AttemptReason[]>> =>
  parseEnvelope(attemptReasonsSchema, await apiGet("logistics/attempt-reasons/", params));

export const loadTransfers = async (params: QueryParams): Promise<Envelope<Transfer[]>> => {
  const envelope = parseEnvelope(transfersSchema, await apiGet("logistics/transfers/", params));
  return { ...envelope, data: envelope.data.results };
};

/** Jonli doska — hozirgi holat (davrga bog'liq emas, filial filtri ishlaydi). */
export const loadLiveBoard = async (params: QueryParams): Promise<Envelope<LiveBoard>> =>
  parseEnvelope(liveSchema, await apiGet("logistics/live/", { filial: params.filial }));

export const loadHandovers = async (params: QueryParams): Promise<Envelope<Handovers>> =>
  parseEnvelope(handoversSchema, await apiGet("logistics/handovers/", { filial: params.filial }));
