import type { Envelope } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";
import { parseFlexible } from "@/shared/lib/lenient";

import { overviewSchema, type Overview } from "../model/overview.schema";

export const loadOverview = async (params: QueryParams): Promise<Envelope<Overview>> =>
  parseFlexible(overviewSchema, await apiGet("overview/v2/", params));
