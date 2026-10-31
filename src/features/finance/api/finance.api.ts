import type { Envelope } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";
import { parseFlexible } from "@/shared/lib/lenient";

import { financeSchema, type Finance } from "../model/finance.schema";

export const loadFinance = async (params: QueryParams): Promise<Envelope<Finance>> =>
  parseFlexible(financeSchema, await apiGet("finance/v2/", params));
