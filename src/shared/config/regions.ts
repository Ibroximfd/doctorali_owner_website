/**
 * O'zbekiston hududlari — platforma shartnomasidagi `delivery.region` kodlari.
 * `row`/`col` — plitka-xarita (geografiyaga yaqin 7×4 to'r) dagi joyi.
 */
export const REGION_TILES = {
  qoraqalpogiston: { short: "QQ", row: 1, col: 1 },
  toshkent: { short: "TV", row: 1, col: 5 },
  toshkent_shahar: { short: "TSH", row: 1, col: 6 },
  namangan: { short: "NAM", row: 1, col: 7 },
  xorazm: { short: "XOR", row: 2, col: 1 },
  navoiy: { short: "NAV", row: 2, col: 2 },
  jizzax: { short: "JIZ", row: 2, col: 3 },
  sirdaryo: { short: "SIR", row: 2, col: 4 },
  fargona: { short: "FAR", row: 2, col: 6 },
  andijon: { short: "AND", row: 2, col: 7 },
  buxoro: { short: "BUX", row: 3, col: 2 },
  samarqand: { short: "SAM", row: 3, col: 3 },
  qashqadaryo: { short: "QAS", row: 4, col: 3 },
  surxondaryo: { short: "SUR", row: 4, col: 4 },
} as const;

export type RegionCode = keyof typeof REGION_TILES;

export const TILE_ROWS = 4;
export const TILE_COLS = 7;

export const isRegionCode = (value: string): value is RegionCode => value in REGION_TILES;
