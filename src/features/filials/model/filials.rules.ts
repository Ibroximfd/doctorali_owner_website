import type { AuditEntry, FilialItem, Head, LeaderRole, Permission, Structure } from "./filials.schema";

export const leaderOf = (
  filial: Pick<FilialItem, "chiefLogist" | "chiefOperator">,
  role: LeaderRole,
): Head | null => (role === "chief_logist" ? filial.chiefLogist : filial.chiefOperator);

/** Katalogdagi dopusk shu rahbar turiga tegishlimi: o'z roli yoki `both` (B-4). */
export const isForRole = (permission: Pick<Permission, "role">, role: LeaderRole): boolean =>
  permission.role === role || permission.role === "both";

/** Bu filial rahbariga berilishi mumkin bo'lgan dopusk: o'z roli, asosiy bo'lmasa — umumiylari. */
export const isPermissionAllowed = (permission: Permission, role: LeaderRole, isMain: boolean): boolean =>
  isForRole(permission, role) && (isMain || !permission.mainOnly);

/** Guruhsiz dopusklar shu nom ostida (oxirida). */
export const OTHER_GROUP = "other";

/**
 * Backend guruhi o'zbekcha so'z (`qila oladi | ko'radi | boshqaradi`) — tarjima kaliti va tartib
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

const groupRank = (group: string): number => {
  const index = GROUP_ORDER.indexOf(group);
  if (index !== -1) return index;
  return group === OTHER_GROUP ? GROUP_ORDER.length + 1 : GROUP_ORDER.length;
};

export type PermissionGroup = {
  group: string;
  items: { permission: Permission; disabled: boolean }[];
};

/**
 * Dopusklar guruhlab (qila oladi · ko'radi · boshqaradi), katalog tartibida. Asosiy filialga
 * xos dopusklar oddiy filialda ko'rinadi, lekin o'chiq — Owner nima uchun yo'qligini ko'rsin.
 */
export const permissionGroups = (
  catalog: readonly Permission[],
  role: LeaderRole,
  isMain: boolean,
): PermissionGroup[] => {
  const groups = new Map<string, PermissionGroup["items"]>();
  for (const permission of catalog) {
    if (!isForRole(permission, role)) continue;
    const group = groupKey(permission.group);
    groups.set(group, [
      ...(groups.get(group) ?? []),
      { permission, disabled: !isPermissionAllowed(permission, role, isMain) },
    ]);
  }
  return [...groups.entries()]
    .map(([group, items]) => ({ group, items }))
    .sort((a, b) => groupRank(a.group) - groupRank(b.group));
};

/** Rol bilan birga keladigan (sukut) huquqlar: `effective` dagi, qo'shimchada yo'q kalitlar. */
export const roleDefaults = (head: Pick<Head, "permissions" | "effectivePermissions">): string[] =>
  (head.effectivePermissions ?? []).filter((key) => !head.permissions.includes(key));

/** Shu rahbarga berilishi mumkin bo'lgan qo'shimcha kalitlar (sukutdagilar va o'chiqlar kirmaydi). */
export const grantableKeys = (
  catalog: readonly Permission[],
  role: LeaderRole,
  isMain: boolean,
  defaults: readonly string[],
): string[] =>
  catalog
    .filter(
      (permission) => isPermissionAllowed(permission, role, isMain) && !defaults.includes(permission.key),
    )
    .map((permission) => permission.key);

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
  role: { id: number; permissions: string[]; effectivePermissions: string[] },
): Structure => {
  const patch = (head: Head | null): Head | null =>
    head && head.roleId === role.id
      ? {
          ...head,
          permissions: role.permissions,
          effectivePermissions:
            head.effectivePermissions === null && role.effectivePermissions.length === 0
              ? null
              : role.effectivePermissions,
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
