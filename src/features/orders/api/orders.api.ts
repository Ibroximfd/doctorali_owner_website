import {
  parseEnvelope,
  parseJson,
  timeseriesSchema,
  type Envelope,
  type Timeseries,
} from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";

import {
  orderDetailSchema,
  ordersBreakdownSchema,
  ordersFunnelSchema,
  ordersHeatmapSchema,
  ordersListSchema,
  ordersSummarySchema,
  stageDurationsSchema,
  stuckOrdersSchema,
  type BreakdownDimension,
  type BreakdownRow,
  type HeatmapCell,
  type OrderDetail,
  type OrdersFunnel,
  type OrdersList,
  type OrdersSummary,
  type StageDuration,
  type StuckOrders,
} from "../model/orders.schema";

export const loadOrdersSummary = async (params: QueryParams): Promise<Envelope<OrdersSummary>> =>
  parseEnvelope(ordersSummarySchema, await apiGet("orders/summary/", params));

export const loadOrdersFunnel = async (params: QueryParams): Promise<Envelope<OrdersFunnel>> =>
  parseEnvelope(ordersFunnelSchema, await apiGet("orders/funnel/", params));

/** Seriyalar: `created`, `delivered`, `cancelled` (soni) + `delivered_amount`. */
export const loadOrdersTrend = async (params: QueryParams): Promise<Envelope<Timeseries>> =>
  parseEnvelope(timeseriesSchema, await apiGet("orders/timeseries/", params));

export const loadOrdersBreakdown = async (
  by: BreakdownDimension,
  params: QueryParams,
): Promise<Envelope<BreakdownRow[]>> =>
  parseEnvelope(ordersBreakdownSchema, await apiGet("orders/breakdown/", { ...params, by }));

export const loadStageDurations = async (params: QueryParams): Promise<Envelope<StageDuration[]>> =>
  parseEnvelope(stageDurationsSchema, await apiGet("orders/stage-durations/", params));

export const loadOrdersHeatmap = async (params: QueryParams): Promise<Envelope<HeatmapCell[]>> =>
  parseEnvelope(ordersHeatmapSchema, await apiGet("orders/heatmap/", params));

/** Hozirgi holat — davrga bog'liq emas, faqat filial bo'yicha torayadi. */
export const loadStuckOrders = async (filial: string | undefined): Promise<Envelope<StuckOrders>> =>
  parseEnvelope(stuckOrdersSchema, await apiGet("orders/stuck/", { filial }));

export type OrderListFilters = { status: string | null; search: string };

/** Ekran faqat eng so'nggilarini ko'rsatadi; aniq buyurtma qidiruv orqali topiladi. */
export const ORDERS_PAGE_SIZE = 10;

export const loadOrders = async (params: QueryParams, filters: OrderListFilters): Promise<OrdersList> =>
  parseJson(
    ordersListSchema,
    await apiGet("orders/", {
      ...params,
      status: filters.status ?? undefined,
      search: filters.search,
      page: 1,
      page_size: ORDERS_PAGE_SIZE,
    }),
  );

export const loadOrder = async (id: string): Promise<OrderDetail> =>
  parseJson(orderDetailSchema, await apiGet(`orders/${encodeURIComponent(id)}/`));
