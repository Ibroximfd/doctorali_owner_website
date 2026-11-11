import { CUSTOM_KIND, DISTRICT_ACTIONS, type DistrictAction, type DistrictChange } from "./districts.schema";

/** Amal ohangi (`Pill` intentlari bilan mos): qo'shish/qaytarish — yaxshi, yashirish — ogohlantirish. */
export type ActionTone = "good" | "info" | "warn" | "neutral";

const ACTION_TONES: Record<DistrictAction, ActionTone> = {
  created: "good",
  restored: "good",
  renamed: "info",
  hidden: "warn",
  edited: "neutral",
};

export const isKnownAction = (action: string): action is DistrictAction =>
  (DISTRICT_ACTIONS as readonly string[]).includes(action);

export const actionTone = (action: string): ActionTone =>
  isKnownAction(action) ? ACTION_TONES[action] : "neutral";

export const isCustomDistrict = (row: Pick<DistrictChange, "district">): boolean =>
  row.district.kind === CUSTOM_KIND;

/** Nom o'zgarishi (`name_uz`): ikkalasi ham `null` bo'lsa — yo'q. */
export const nameChange = (
  row: Pick<DistrictChange, "oldName" | "newName">,
): { from: string | null; to: string | null } | null =>
  row.oldName === null && row.newName === null ? null : { from: row.oldName, to: row.newName };

export type DistrictChangeFilters = {
  /** Viloyat kodi (`fargona`); backend vergulli ro'yxatni ham qabul qiladi. */
  region: string | null;
  /** Tuman kodi (`fargona/qoqon_sh`). */
  district: string | null;
  /** `YYYY-MM-DD`, Toshkent kuni, ikkala chet kiradi. */
  from: string | null;
  to: string | null;
  page: number;
};

export const hasFilters = (filters: DistrictChangeFilters): boolean =>
  [filters.region, filters.district, filters.from, filters.to].some((value) => value !== null);

/** Sahifa oralig'i: «51–100 / 230». */
export const pageRange = (page: number, pageSize: number, count: number) => ({
  from: count === 0 ? 0 : (page - 1) * pageSize + 1,
  to: Math.min(count, page * pageSize),
  pages: Math.max(1, Math.ceil(count / pageSize)),
});
