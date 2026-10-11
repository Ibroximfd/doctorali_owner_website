import { parseEnvelope, type Envelope } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";

import { productsSchema, type Products } from "../model/products.schema";

export const loadProducts = async (params: QueryParams): Promise<Envelope<Products>> =>
  parseEnvelope(productsSchema, await apiGet("products/", params));
