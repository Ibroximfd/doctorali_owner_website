import type { Envelope } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";
import { parseFlexible } from "@/shared/lib/lenient";

import { appV2Schema, type AppV2 } from "../model/mobile-app.schema";

/** Bitta so'rov butun sahifani to'ldiradi (B-14). */
export const loadAppV2 = async (params: QueryParams): Promise<Envelope<AppV2>> =>
  parseFlexible(appV2Schema, await apiGet("app/v2/", params));
