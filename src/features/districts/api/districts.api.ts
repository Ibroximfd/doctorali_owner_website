import { parseJson } from "@/shared/lib/envelope";
import { apiGet } from "@/shared/lib/http";

import type { DistrictChangeFilters } from "../model/districts.rules";
import {
  DISTRICT_CHANGES_PAGE_SIZE,
  districtChangesSchema,
  type DistrictChanges,
} from "../model/districts.schema";

/**
 * Tumanlar tarixi (bo'lim `logistics`) — faqat o'qiladi. Xatolar: `403 section_forbidden`
 * (ko'ruvchida logistika yo'q), `400 validation_error` (`fields.region` — notanish viloyat).
 */
export const loadDistrictChanges = async (filters: DistrictChangeFilters): Promise<DistrictChanges> =>
  parseJson(
    districtChangesSchema,
    await apiGet("logistics/district-changes/", {
      region: filters.region ?? undefined,
      district: filters.district ?? undefined,
      date_from: filters.from ?? undefined,
      date_to: filters.to ?? undefined,
      page: filters.page,
      page_size: DISTRICT_CHANGES_PAGE_SIZE,
    }),
  );
