export const LOCALES = ["uz", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";
export const LOCALE_COOKIE = "da_owner_locale";

export const isLocale = (value: string | undefined): value is Locale =>
  value !== undefined && (LOCALES as readonly string[]).includes(value);

/** Har bo'lim o'z nomlar fazosida — `messages/<til>/<fazo>.json`. */
export const MESSAGE_NAMESPACES = [
  "common",
  "nav",
  "scope",
  "auth",
  "telegram",
  "overview",
  "orders",
  "finance",
  "clinic",
  "logistics",
  "sales",
  "mobileApp",
  "products",
  "customers",
  "doctors",
  "alerts",
  "reports",
  "settings",
] as const;
export type MessageNamespace = (typeof MESSAGE_NAMESPACES)[number];
