import { MOCK_FILIALS } from "../engine";
import { sample } from "../sample";
import type { MockHandler } from "../types";

/** `meta/` va `me/` — lug'atlar va joriy foydalanuvchi. */
export const metaHandlers: MockHandler[] = [
  {
    method: "GET",
    path: "meta/",
    resolve: () => ({
      filials: MOCK_FILIALS.map(({ share: _share, ...filial }) => filial),
      regions: sample.regions.map((region) => ({ code: region.code, name: region.name })),
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
