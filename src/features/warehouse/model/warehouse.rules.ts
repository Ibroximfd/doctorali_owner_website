import type { FilialGrants, Sklad, SkladOverview, StockCell } from "./warehouse.schema";

/** Sklad rangi tartibi qat'iy — sklad id siga bog'langan (ro'yxat tartibiga emas). */
export const skladColorIndex = (sklads: readonly Pick<Sklad, "id">[], id: number): number =>
  Math.max(
    0,
    [...sklads].sort((a, b) => a.id - b.id).findIndex((sklad) => sklad.id === id),
  );

/** Viloyat → uni qamragan sklad. */
export const skladByRegion = (sklads: readonly Sklad[]): Map<string, Sklad> =>
  new Map(sklads.flatMap((sklad) => sklad.regions.map((code) => [code, sklad] as const)));

/** Sklad xulosasi (xarita kartasi): viloyatlari bo'yicha `overview` yig'indisi. */
export const skladSummary = (sklad: Pick<Sklad, "regions">, overview: SkladOverview | undefined) => {
  const rows = overview?.regions.filter((row) => sklad.regions.includes(row.code)) ?? [];
  return {
    onHand: rows.reduce((sum, row) => sum + row.onHand, 0),
    withCouriers: rows.reduce((sum, row) => sum + row.withCouriers, 0),
    lowItems: rows.reduce((sum, row) => sum + row.lowItems, 0),
  };
};

export type StockRow = {
  itemId: number;
  name: string;
  qty: number;
  courierQty: number;
  minQty: number;
  isLow: boolean;
};

/**
 * Qoldiq mahsulot bo'yicha: viloyat omborlari (`kind=region`) — skladda, kuryer omborlari — kuryerlarda.
 * `regions` berilsa — faqat shu sklad viloyatlari, aks holda hammasi.
 */
export const stockRows = (cells: readonly StockCell[], regions: readonly string[] | null): StockRow[] => {
  const byItem = new Map<number, StockRow>();
  for (const cell of cells) {
    if (regions && (cell.location.region === null || !regions.includes(cell.location.region))) continue;
    const row = byItem.get(cell.item.id) ?? {
      itemId: cell.item.id,
      name: cell.item.name,
      qty: 0,
      courierQty: 0,
      minQty: 0,
      isLow: false,
    };
    if (cell.location.kind === "courier") row.courierQty += cell.onHand;
    else {
      row.qty += cell.onHand;
      row.minQty += cell.minQuantity;
      row.isLow ||= cell.isLow;
    }
    byItem.set(cell.item.id, row);
  }
  return [...byItem.values()].sort(
    (a, b) => Number(b.isLow) - Number(a.isLow) || a.name.localeCompare(b.name),
  );
};

/** Mahsulot → dopusk berilgan filial (bitta mahsulot — bitta filial). */
export const grantOwners = (grants: readonly FilialGrants[]): Map<number, number> =>
  new Map(grants.flatMap((grant) => grant.items.map((item) => [item.productId, grant.filialId] as const)));

/** Sahifalash yorlig'i uchun: «21–40 / 134». */
export const pageRange = (page: number, pageSize: number, count: number) => ({
  from: count === 0 ? 0 : (page - 1) * pageSize + 1,
  to: Math.min(count, page * pageSize),
  pages: Math.max(1, Math.ceil(count / pageSize)),
});

/** Dopusk ro'yxati: hech bir filialga berilmaganlar alohida (egasi birinchi ko'rsin), qolgani. */
export const splitByGrant = <Item extends { id: number }>(
  items: readonly Item[],
  owners: ReadonlyMap<number, number>,
): { unassigned: Item[]; assigned: Item[] } => ({
  unassigned: items.filter((item) => !owners.has(item.id)),
  assigned: items.filter((item) => owners.has(item.id)),
});
