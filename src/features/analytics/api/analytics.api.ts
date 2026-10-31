import type { Envelope } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";
import { parseFlexible } from "@/shared/lib/lenient";

import { analyticsSchema, type Analytics } from "../model/analytics.schema";

export const loadAnalytics = async (params: QueryParams): Promise<Envelope<Analytics>> =>
  parseFlexible(analyticsSchema, await apiGet("analytics/v2/", params));
