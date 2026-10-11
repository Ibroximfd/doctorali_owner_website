import { parseJson } from "@/shared/lib/envelope";
import { apiGet } from "@/shared/lib/http";

import { metaSchema, type Meta } from "./meta.schema";

export const loadMeta = async (): Promise<Meta> => parseJson(metaSchema, await apiGet("meta/"));
