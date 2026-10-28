export const HEALTH_STATUSES = ["ok", "degraded", "down"] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];
export const isHealthStatus = (value: string): value is HealthStatus =>
  HEALTH_STATUSES.some((known) => known === value);

export const COMPONENT_KEYS = [
  "database",
  "api",
  "queue",
  "cache",
  "bitrix",
  "marketplace_erp",
  "telegram",
  "sms",
  "payments",
  "storage",
] as const;
export type ComponentKey = (typeof COMPONENT_KEYS)[number];
export const isComponentKey = (value: string): value is ComponentKey =>
  COMPONENT_KEYS.some((known) => known === value);

/** Muammoli komponentlar tepada: down → degraded → ok. */
export const sortComponents = <Row extends { status: string }>(rows: readonly Row[]): Row[] => {
  const rank = (status: string) => {
    const order = ["down", "degraded", "ok"];
    const index = order.indexOf(status);
    return index === -1 ? order.length : index;
  };
  return [...rows].sort((a, b) => rank(a.status) - rank(b.status));
};

/** Sinxron kechikishi o'qiladigan ko'rinishda: soniya → daqiqa/soat. */
export const lagParts = (seconds: number): { value: number; unit: "seconds" | "minutes" | "hours" } => {
  if (seconds < 60) return { value: Math.round(seconds), unit: "seconds" };
  if (seconds < 3600) return { value: Math.round(seconds / 60), unit: "minutes" };
  return { value: Math.round(seconds / 3600), unit: "hours" };
};
