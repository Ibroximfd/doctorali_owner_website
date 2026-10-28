import { parseEnvelope, timeseriesSchema, type Envelope, type Timeseries } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";

import {
  salesMixSchema,
  stockSchema,
  warehouseSummarySchema,
  warehousesSchema,
  type SalesMix,
  type StockRow,
  type Warehouse,
  type WarehouseSummary,
} from "../model/warehouse.schema";

export const loadWarehouseSummary = async (params: QueryParams): Promise<Envelope<WarehouseSummary>> =>
  parseEnvelope(warehouseSummarySchema, await apiGet("warehouse/summary/", params));

export const loadWarehouses = async (params: QueryParams): Promise<Envelope<Warehouse[]>> =>
  parseEnvelope(warehousesSchema, await apiGet("warehouse/warehouses/", params));

/** `warehouse` berilmasa — hamma omborlar qatori. */
export const loadStock = async (
  params: QueryParams,
  warehouse: number | null,
): Promise<Envelope<StockRow[]>> =>
  parseEnvelope(
    stockSchema,
    await apiGet("warehouse/stock/", { ...params, warehouse: warehouse ?? undefined }),
  );

/** Kirim va chiqim (dona): `inbound`, `outbound` seriyalari. */
export const loadMovements = async (params: QueryParams): Promise<Envelope<Timeseries>> =>
  parseEnvelope(timeseriesSchema, await apiGet("warehouse/movements/", params));

/** Chiqim tarkibi: to'liq narx, chegirma va sovg'a (davr bo'yicha). */
export const loadSalesMix = async (params: QueryParams): Promise<Envelope<SalesMix>> =>
  parseEnvelope(salesMixSchema, await apiGet("warehouse/sales-mix/", params));
