import { seqStep } from "@/shared/config/chart-palette";

import type { ChiefAccount, Handover, HandoverStatus, RegionMoney } from "./finance.schema";

/** Bosh kuryerga hali to'lanmagan haq; to'langani noma'lum bo'lsa — `null`. */
export const feeDue = (row: { chiefFee: number; chiefFeePaid: number | null }): number | null =>
  row.chiefFeePaid === null ? null : Math.max(0, row.chiefFee - row.chiefFeePaid);

/** Hisob qatori: bitta bosh kuryer × bitta filial — jadvalda yassi ro'yxat. */
export type ChiefRow = ChiefAccount["byFilial"][number] & {
  skladId: number;
  skladName: string;
  chiefName: string;
  /** Filialga yetmagan pul yig'ilganining qancha qismi (%). */
  pendingPct: number;
};

/** Kutilayotgan pul ulushi shu chegaradan oshsa — e'tibor (odatda har kuni topshiriladi). */
export const PENDING_ALERT_PCT = 20;

export const chiefRows = (chiefs: readonly ChiefAccount[]): ChiefRow[] =>
  chiefs.flatMap((chief) =>
    chief.byFilial.map((row) => ({
      ...row,
      skladId: chief.skladId,
      skladName: chief.skladName,
      chiefName: chief.chiefName,
      pendingPct: row.collected > 0 ? (row.pending / row.collected) * 100 : 0,
    })),
  );

/** Xarita: har viloyat puli 6 qadamli ketma-ket shkalaga (eng kattasiga nisbatan). Puli yo'q — `null`. */
export const regionSteps = (regions: readonly RegionMoney[]): Map<string, number | null> => {
  const max = Math.max(0, ...regions.map((region) => region.money));
  return new Map(
    regions.map((region) => [region.code, region.money > 0 ? seqStep(region.money, max) : null]),
  );
};

/** Tepada turish tartibi: bahsli → kutilmoqda → tasdiqlandi. */
const STATUS_RANK: Readonly<Record<HandoverStatus, number>> = { disputed: 0, pending: 1, confirmed: 2 };

/**
 * Har bosh kuryer × filial juftligining oxirgi topshirig'i: bahsli va tasdiqlanmaganlar tepada,
 * keyin eng yangisi. Owner bir qarashda qaysi pul hali filialda tasdiqlanmaganini ko'radi.
 */
export const lastHandovers = (rows: readonly Handover[]): Handover[] => {
  const latest = new Map<string, Handover>();
  for (const row of rows) {
    const key = `${row.skladId}-${row.filialId}`;
    const current = latest.get(key);
    if (!current || row.date > current.date) latest.set(key, row);
  }
  return [...latest.values()].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.date.localeCompare(a.date) || b.amount - a.amount,
  );
};
