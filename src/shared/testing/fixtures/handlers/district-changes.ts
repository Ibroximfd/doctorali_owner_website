import { isRegionCode } from "@/shared/config/regions";
import { tashkentDate } from "@/shared/lib/scope";

import type { MockContext } from "../engine";
import { mockResponse, type MockHandler } from "../types";

/**
 * Tumanlar tarixi — `GET /api/owner/logistics/district-changes/` (prod javobi shakli, 2026-11-11):
 * konvertsiz `{count, page, page_size, results}`, eng yangisi birinchi. Filtrlar: `region`
 * (vergulli; notanish → `400 validation_error` + `fields.region`), `district`, `date_from`/`date_to`
 * (Toshkent kuni, chetlar kiradi), `page`, `page_size` (≤ 200).
 */

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

const CHIEF_VODIY = { id: 512, name: "Bosh kuryer Farg'ona" };
const ADMIN = { id: 1, name: "Admin" };

const CHANGES = [
  {
    id: 17,
    at: "2026-11-11T07:15:00Z",
    region: "fargona",
    region_name: "Farg'ona",
    district: { code: "fargona/qoqon_sh", name_uz: "Qo'qon", kind: "city", is_active: true },
    action: "renamed",
    old_name: "Qo'qon shahri",
    new_name: "Qo'qon",
    changes: [
      { field: "name_uz", old: "Qo'qon shahri", new: "Qo'qon" },
      { field: "name_uz_cyrl", old: "Қўқон шаҳри", new: "Қўқон" },
    ],
    actor: CHIEF_VODIY,
    source: "chief",
  },
  {
    id: 16,
    at: "2026-11-11T05:40:00Z",
    region: "fargona",
    region_name: "Farg'ona",
    district: { code: "fargona/yangi_bozor", name_uz: "Yangi bozor", kind: "custom", is_active: false },
    action: "hidden",
    old_name: null,
    new_name: null,
    changes: [{ field: "is_active", old: true, new: false }],
    actor: CHIEF_VODIY,
    source: "chief",
  },
  {
    id: 15,
    at: "2026-11-10T12:05:00Z",
    region: "fargona",
    region_name: "Farg'ona",
    district: { code: "fargona/yangi_bozor", name_uz: "Yangi bozor", kind: "custom", is_active: true },
    action: "created",
    old_name: null,
    new_name: "Yangi bozor",
    changes: [{ field: "name_uz", old: null, new: "Yangi bozor" }],
    actor: CHIEF_VODIY,
    source: "chief",
  },
  {
    id: 14,
    at: "2026-11-10T09:30:00Z",
    region: "samarqand",
    region_name: "Samarqand",
    district: { code: "samarqand/urgut", name_uz: "Urgut", kind: "district", is_active: true },
    action: "edited",
    old_name: null,
    new_name: null,
    changes: [{ field: "name_ru", old: "Ургутский", new: "Ургут" }],
    actor: ADMIN,
    source: "admin",
  },
  {
    id: 13,
    at: "2026-11-10T04:00:00Z",
    region: "samarqand",
    region_name: "Samarqand",
    district: { code: "samarqand/pastdargom", name_uz: "Pastdarg'om", kind: "district", is_active: true },
    action: "restored",
    old_name: null,
    new_name: null,
    changes: [{ field: "is_active", old: false, new: true }],
    actor: null,
    source: "admin",
  },
] as const;

const positiveInt = (raw: string | null, fallback: number): number => {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const districtChanges = (ctx: MockContext) => {
  const query = ctx.searchParams;
  const regions = (query.get("region") ?? "").split(",").filter((code) => code !== "");
  const unknown = regions.filter((code) => !isRegionCode(code));
  if (unknown.length > 0)
    return mockResponse(400, {
      code: "validation_error",
      detail: "validation_error",
      fields: { region: [`Noma'lum viloyat: ${unknown.join(", ")}`] },
    });

  const district = query.get("district");
  const from = query.get("date_from");
  const to = query.get("date_to");
  const rows = CHANGES.filter((row) => {
    const day = tashkentDate(new Date(row.at));
    return (
      (regions.length === 0 || regions.includes(row.region)) &&
      (district === null || row.district.code === district) &&
      (from === null || day >= from) &&
      (to === null || day <= to)
    );
  });

  const page = positiveInt(query.get("page"), 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, positiveInt(query.get("page_size"), DEFAULT_PAGE_SIZE));
  return {
    count: rows.length,
    page,
    page_size: pageSize,
    results: rows.slice((page - 1) * pageSize, page * pageSize),
  };
};

export const districtChangesHandlers: readonly MockHandler[] = [
  { method: "GET", path: "logistics/district-changes/", resolve: districtChanges },
];
