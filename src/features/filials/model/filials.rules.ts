import type {
  AuditEntry,
  FilialItem,
  Head,
  LeaderRole,
  Permission,
  RoleResult,
  Structure,
} from "./filials.schema";

export const leaderOf = (
  filial: Pick<FilialItem, "chiefLogist" | "chiefOperator">,
  role: LeaderRole,
): Head | null => (role === "chief_logist" ? filial.chiefLogist : filial.chiefOperator);

/** Katalogdagi dopusk shu rahbar turiga tegishlimi: o'z roli yoki `both` (B-4). */
export const isForRole = (permission: Pick<Permission, "role">, role: LeaderRole): boolean =>
  permission.role === role || permission.role === "both";

/** Guruhsiz dopusklar shu nom ostida (oxirida). */
export const OTHER_GROUP = "other";

/**
 * Eski backend guruhi o'zbekcha so'z (`qila oladi | ko'radi | boshqaradi`) — tarjima kaliti va tartib
 * uchun barqaror kalitga keltiriladi; notanish guruh o'z nomi bilan qoladi.
 */
const GROUP_KEYS: Readonly<Record<string, string>> = {
  "qila oladi": "do",
  "ko'radi": "see",
  boshqaradi: "manage",
};
const GROUP_ORDER = ["do", "see", "manage"];

export const groupKey = (group: string | null): string => {
  if (group === null || group.trim() === "") return OTHER_GROUP;
  const normalized = group
    .trim()
    .toLowerCase()
    .replace(/[ʻʼ‘’`]/g, "'");
  return GROUP_KEYS[normalized] ?? group;
};

/**
 * Guruh: yangi katalogda `group_label` (TZ 32 §D-3 — backend sarlavhasi, katalog tartibida), eski
 * katalogda `group` dan barqaror kalit.
 */
const groupOf = (permission: Pick<Permission, "group" | "groupLabel">): string =>
  permission.groupLabel?.trim() ? permission.groupLabel.trim() : groupKey(permission.group);

const groupRank = (group: string): number => {
  const index = GROUP_ORDER.indexOf(group);
  if (index !== -1) return index;
  return group === OTHER_GROUP ? Number.MAX_SAFE_INTEGER : GROUP_ORDER.length;
};

export type PermissionGroup = { group: string; items: Permission[] };

/**
 * Shu rahbar turining dopusklari guruhlab, katalog tartibida (`group_label` bo'lsa — backend
 * sarlavhalari kelgan tartibda). §M-1 dan keyin `main_only` qulf EMAS — faqat yorliq: owner
 * imtiyoz kalitlarini istalgan filial rahbariga beradi.
 */
export const permissionGroups = (catalog: readonly Permission[], role: LeaderRole): PermissionGroup[] => {
  const groups = new Map<string, Permission[]>();
  for (const permission of catalog) {
    if (!isForRole(permission, role)) continue;
    const group = groupOf(permission);
    groups.set(group, [...(groups.get(group) ?? []), permission]);
  }
  return [...groups.entries()]
    .map(([group, items]) => ({ group, items }))
    .sort((a, b) => groupRank(a.group) - groupRank(b.group));
};

/**
 * Dopusk oynasi rejimi (TZ 32 §D-1):
 * - `full` — javobda `role_defaults` bor: `permissions` samarali to'liq to'plam, HAR kalit (sukutdagisi
 *   ham) o'chirib-yoqiladi; `defaults` faqat «sukut» yorlig'i uchun;
 * - `extras` — eski backend: `permissions` qo'shimchalar, `locked` (rol bilan keladi) o'chirilmaydi.
 */
export type PermissionMode =
  { kind: "full"; defaults: readonly string[] } | { kind: "extras"; locked: readonly string[] };

/** Eski backend: rol bilan keladigan huquqlar — `effective` dagi, qo'shimchada yo'q kalitlar (B-26). */
export const legacyDefaults = (head: Pick<Head, "permissions" | "effectivePermissions">): string[] =>
  (head.effectivePermissions ?? []).filter((key) => !head.permissions.includes(key));

export const permissionModeOf = (
  head: Pick<Head, "permissions" | "effectivePermissions" | "roleDefaults">,
): PermissionMode =>
  head.roleDefaults !== null
    ? { kind: "full", defaults: head.roleDefaults }
    : { kind: "extras", locked: legacyDefaults(head) };

/** Qulflangan (o'chirib bo'lmaydigan) kalitlar — faqat eski rejimda. */
export const lockedKeys = (mode: PermissionMode): readonly string[] =>
  mode.kind === "extras" ? mode.locked : [];

/** Sukut yorlig'i qo'yiladigan kalitlar. */
export const defaultKeys = (mode: PermissionMode): readonly string[] =>
  mode.kind === "full" ? mode.defaults : mode.locked;

/** Shu rahbarga o'chirib-yoqiladigan kalitlar: rol katalogidagi hammasi, qulflanganlardan tashqari. */
export const grantableKeys = (
  catalog: readonly Permission[],
  role: LeaderRole,
  locked: readonly string[] = [],
): string[] =>
  catalog
    .filter((permission) => isForRole(permission, role) && !locked.includes(permission.key))
    .map((permission) => permission.key);

/** Sukutda bor, lekin hozir tanlanmagan — «olingan» belgisi (`revoked_defaults` ning jonli hisobi). */
export const revokedDefaults = (mode: PermissionMode, selected: readonly string[]): string[] =>
  mode.kind === "full" ? mode.defaults.filter((key) => !selected.includes(key)) : [];

/**
 * Saqlangan to'plamda bor, lekin shu rahbar katalogida yo'q kalitlar (masalan, eski yoki boshqa
 * rol kaliti) — `PATCH` to'liq ro'yxat bo'lgani uchun yo'qolmasin, alohida ko'rsatiladi.
 */
export const uncataloguedKeys = (
  catalog: readonly Permission[],
  role: LeaderRole,
  selected: readonly string[],
): string[] => {
  const known = new Set(catalog.filter((permission) => isForRole(permission, role)).map((item) => item.key));
  return selected.filter((key) => !known.has(key));
};

/** §D-2a kaskad: kalit nechta quyi xodimdan ham olindi (o'rin bo'yicha takrorsiz). */
export const cascadeCount = (role: Pick<RoleResult, "cascade">): number =>
  new Set(role.cascade.map((row) => row.seatId)).size;

/** Saqlashdan oldin: nima beriladi, nima olinadi. */
export const permissionDiff = (before: readonly string[], after: readonly string[]) => ({
  added: after.filter((key) => !before.includes(key)),
  removed: before.filter((key) => !after.includes(key)),
});

/** Dopusk nomi joriy tilda; katalog yo'q bo'lsa — kalitning o'zi. */
export const permissionLabel = (
  catalog: readonly Permission[] | undefined,
  key: string,
  locale: string,
): string => {
  const permission = catalog?.find((item) => item.key === key);
  if (!permission) return key;
  return locale === "ru" ? permission.labelRu : permission.label;
};

export const togglePermission = (selected: readonly string[], key: string): string[] =>
  selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key];

/** Asosiy filial birinchi, faollari oldin, qolganlari yaratilish tartibida. */
export const sortFilials = <Row extends Pick<FilialItem, "id" | "isMain" | "isActive">>(
  rows: readonly Row[],
): Row[] =>
  [...rows].sort(
    (a, b) => Number(b.isMain) - Number(a.isMain) || Number(b.isActive) - Number(a.isActive) || a.id - b.id,
  );

/** Audit qatorlari: shu filialga (va berilsa — shu rahbar turiga) tegishlilari. */
export const auditFor = (rows: readonly AuditEntry[], filialId: number, kind?: LeaderRole): AuditEntry[] =>
  rows.filter(
    (row) => Number(row.params.filialId) === filialId && (kind === undefined || row.params.kind === kind),
  );

/** Audit qatoridagi odam ismi (`params.full_name`, B-6a) — bo'lmasa `null`. */
export const auditPerson = (row: AuditEntry): string | null => {
  const value = row.params.fullName;
  return typeof value === "string" && value.trim() !== "" ? value : null;
};

/** `params.seatId` va h.k. — audit parametrlari ochiq lug'at, son bo'lsa son. */
export const auditNumber = (row: AuditEntry, key: string): number | null => {
  const value = row.params[key];
  return typeof value === "number" ? value : null;
};

/** Login band: `409 username_taken` (B-1) yoki `validation_error` + `fields.username`. */
export const isUsernameTaken = (error: {
  code?: string;
  fields: Readonly<Record<string, unknown>>;
}): boolean =>
  error.code === "username_taken" || (error.code === "validation_error" && "username" in error.fields);

/** `PATCH roles/{id}` javobini tuzilmaga yozadi: shu rol egasining dopusklari darhol yangilanadi. */
export const withRolePermissions = (
  structure: Structure,
  role: Pick<RoleResult, "id" | "permissions" | "effectivePermissions" | "roleDefaults" | "revokedDefaults">,
): Structure => {
  const patch = (head: Head | null): Head | null =>
    head && head.roleId === role.id
      ? {
          ...head,
          permissions: role.permissions,
          effectivePermissions: role.effectivePermissions ?? head.effectivePermissions,
          roleDefaults: role.roleDefaults ?? head.roleDefaults,
          revokedDefaults: role.revokedDefaults,
        }
      : head;
  return {
    ...structure,
    results: structure.results.map((filial) => ({
      ...filial,
      chiefLogist: patch(filial.chiefLogist),
      chiefOperator: patch(filial.chiefOperator),
    })),
  };
};

/**
 * Filial hududi yorlig'i (B-16): `region` — kod. Lug'at (`meta.regions`, joriy tilda) kodni
 * tanisa — undan; tanimasa — backend `region_name`; u ham bo'lmasa — qiymatning o'zi (eski
 * javobda `region` nom edi). Hudud yo'q — `null`.
 */
export const filialRegionLabel = (
  filial: Pick<FilialItem, "region" | "regionName">,
  lookup: (code: string) => string,
): string | null => {
  if (!filial.region) return filial.regionName;
  const known = lookup(filial.region);
  return known !== filial.region ? known : (filial.regionName ?? filial.region);
};
