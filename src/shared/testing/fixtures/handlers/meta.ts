import { REGION_NAMES, codeOf, filialsState } from "../structure-v2";
import type { MockHandler } from "../types";

/** `meta/` va `me/` — lug'atlar va joriy foydalanuvchi. */
export const metaHandlers: MockHandler[] = [
  {
    method: "GET",
    path: "meta/",
    resolve: () => ({
      filials: filialsState().map((filial) => ({
        id: filial.id,
        code: codeOf(filial),
        name: filial.name,
        region: filial.region,
        is_main: filial.is_main,
      })),
      regions: Object.entries(REGION_NAMES).map(([code, name]) => ({ code, name })),
      first_data_date: "2024-03-01",
      currency: "UZS",
    }),
  },
  {
    method: "GET",
    path: "me/",
    resolve: () => ({
      id: 1,
      full_name: "Boshliq",
      role: "owner",
      sections: [],
      filials: [],
      mask_pii: false,
    }),
  },
];
