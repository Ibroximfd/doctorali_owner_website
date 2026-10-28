import { parseEnvelope, type Envelope } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";

import { regionLiveSchema, regionsSchema, type RegionLive, type RegionRow } from "../model/regions.schema";

export const loadRegions = async (params: QueryParams): Promise<Envelope<RegionRow[]>> =>
  parseEnvelope(regionsSchema, await apiGet("regions/", params));

/** Hozirgi holat — davr yuborilmaydi, faqat filial. */
export const loadRegionLive = async (code: string, params: QueryParams): Promise<Envelope<RegionLive>> =>
  parseEnvelope(
    regionLiveSchema,
    await apiGet(`regions/${encodeURIComponent(code)}/live/`, { filial: params.filial }),
  );
