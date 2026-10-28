import type { PermissionDef, RoleTemplate } from "./iam.schema";

export const PERMISSION_LEVELS = ["view", "detail", "sensitive", "act", "manage"] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];
export const isPermissionLevel = (value: string): value is PermissionLevel =>
  PERMISSION_LEVELS.some((known) => known === value);

export const ACCOUNT_STATUSES = ["active", "invited", "blocked", "offboarded"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export const isAccountStatus = (value: string): value is AccountStatus =>
  ACCOUNT_STATUSES.some((known) => known === value);

/** Shablon va tanlangan to'plamdan backendga yuboriladigan farq: qo'shilgan va olib tashlangan. */
export const grantDiff = (
  template: readonly string[],
  selected: readonly string[],
): { extra: string[]; denied: string[] } => ({
  extra: selected.filter((key) => !template.includes(key)),
  denied: template.filter((key) => !selected.includes(key)),
});

/** Samarali to'plam: shablon + qo'shilgan − olib tashlangan (`08` §A.2). */
export const effectivePermissions = (
  template: readonly string[],
  extra: readonly string[],
  denied: readonly string[],
): string[] => [...new Set([...template, ...extra])].filter((key) => !denied.includes(key));

/** Katalogni modul bo'yicha guruhlaydi, modul ichida — daraja tartibida. */
export const groupByModule = (
  catalog: readonly PermissionDef[],
): { module: string; items: PermissionDef[] }[] => {
  const modules = [...new Set(catalog.map((item) => item.module))];
  const rank = (level: string) => {
    const index = PERMISSION_LEVELS.findIndex((known) => known === level);
    return index === -1 ? PERMISSION_LEVELS.length : index;
  };
  return modules.map((module) => ({
    module,
    items: catalog.filter((item) => item.module === module).sort((a, b) => rank(a.level) - rank(b.level)),
  }));
};

export const templatesFor = (roles: readonly RoleTemplate[], department: string): RoleTemplate[] =>
  roles.filter((role) => role.department === department);

/** Telefon: +998 va 9 raqam. */
export const isValidPhone = (phone: string): boolean => /^\+998\d{9}$/.test(phone.replace(/\s/g, ""));

export const accountIssues = (input: {
  fullName: string;
  phone: string;
  department: string;
  permissions: readonly string[];
}): ("name" | "phone" | "department" | "permissions")[] => [
  ...(input.fullName.trim().length >= 3 ? [] : (["name"] as const)),
  ...(isValidPhone(input.phone) ? [] : (["phone"] as const)),
  ...(input.department ? [] : (["department"] as const)),
  ...(input.permissions.length > 0 ? [] : (["permissions"] as const)),
];

const levelRank = (level: string): number => PERMISSION_LEVELS.findIndex((known) => known === level);

/**
 * «Kim nimani ko'radi» katagi: har modul uchun samarali ruxsatlar ichidagi eng yuqori daraja
 * (ko'rish < tafsilot < maxfiy < amal < boshqaruv). Ruxsat yo'q modul — `null`.
 */
export const moduleLevels = (
  effective: readonly string[],
  catalog: readonly PermissionDef[],
): Record<string, PermissionLevel | null> => {
  const granted = new Set(effective);
  const result: Record<string, PermissionLevel | null> = {};
  for (const item of catalog) {
    result[item.module] ??= null;
    if (!granted.has(item.key) || !isPermissionLevel(item.level)) continue;
    const current = result[item.module];
    if (current === null || current === undefined || levelRank(item.level) > levelRank(current)) {
      result[item.module] = item.level;
    }
  }
  return result;
};

/** Shablon bo'yicha akkauntlar soni (ishdan ketganlarsiz), ko'pidan oziga. */
export const roleCounts = (
  roles: readonly RoleTemplate[],
  accounts: readonly { role: string | null; status: string }[],
): { role: RoleTemplate; count: number }[] =>
  roles
    .map((role) => ({
      role,
      count: accounts.filter((account) => account.role === role.key && account.status !== "offboarded")
        .length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

/** AI kuzatuvi: eng ko'p ishlatilmagan ruxsati bor faol akkaunt (yo'q bo'lsa — `null`). */
export const unusedLeader = <Account extends { status: string; unusedPermissions: readonly string[] }>(
  accounts: readonly Account[],
): Account | null =>
  accounts
    .filter((account) => account.status === "active" && account.unusedPermissions.length > 0)
    .reduce<Account | null>(
      (best, account) =>
        best === null || account.unusedPermissions.length > best.unusedPermissions.length ? account : best,
      null,
    );
