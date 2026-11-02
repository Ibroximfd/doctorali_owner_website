import type { Envelope } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";
import { parseFlexible } from "@/shared/lib/lenient";

import {
  couriersDataSchema,
  logistsDataSchema,
  operatorsDataSchema,
  type CouriersData,
  type LogistsData,
  type OperatorsData,
} from "../model/ratings.schema";

/**
 * Reytinglar (§5.r) — davr (`period`/`date_from`/`date_to`) va `?filial=` global filtrdan.
 * ⚠️ `stars`, `has_comment`, `region` owner endpointida hujjatlanmagan — yuborilmaydi
 * (ular xodim saytlaridagi `…/ratings/` filtrlari); ro'yxat filtrlari klientda.
 */

export const loadCourierRatings = async (params: QueryParams): Promise<Envelope<CouriersData>> =>
  parseFlexible(couriersDataSchema, await apiGet("ratings/couriers/", params));

export const loadOperatorRatings = async (params: QueryParams): Promise<Envelope<OperatorsData>> =>
  parseFlexible(operatorsDataSchema, await apiGet("ratings/operators/", params));

export const loadLogistRatings = async (params: QueryParams): Promise<Envelope<LogistsData>> =>
  parseFlexible(logistsDataSchema, await apiGet("ratings/logists/", params));
