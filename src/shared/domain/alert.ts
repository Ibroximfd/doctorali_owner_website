import { z } from "zod";

import type { PanelRouteKey } from "@/shared/config/routes";
import type { Camelized } from "@/shared/lib/camelize";

/** Signal — bir nechta bo'lim ko'rsatadi (Umumiy, Signallar), shuning uchun `shared` da. */
export const ALERT_SEVERITIES = ["critical", "serious", "moderate"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const alertSchema = z.object({
  id: z.number(),
  code: z.string(),
  severity: z.enum(ALERT_SEVERITIES),
  status: z.enum(["open", "acknowledged", "resolved"]),
  title: z.string(),
  body: z.string(),
  filial: z.string().nullable(),
  metric_value: z.number().nullable(),
  threshold: z.number().nullable(),
  ref: z.object({ type: z.string(), id: z.string() }).nullable(),
  opened_at: z.string(),
  acknowledged_at: z.string().nullable(),
  resolved_at: z.string().nullable(),
});

export type Alert = Camelized<z.infer<typeof alertSchema>>;

/** Signal kodi prefiksi (`orders.unassigned_courier` → `orders`) — toifa yorlig'i va havola uchun. */
export const alertCategory = (code: string): string => code.split(".")[0] ?? code;

const CATEGORY_ROUTE: Record<string, PanelRouteKey> = {
  orders: "orders",
  cod: "logistics",
  clinic: "finance",
  debts: "finance",
  payouts: "finance",
  stock: "products",
  calls: "sales",
  activities: "sales",
  ratings: "sales",
  sales: "sales",
  revenue: "overview",
  plan: "overview",
  app: "app",
};

/** "Ko'rish" qaysi bo'limga olib boradi. Noma'lum toifa — Signallar sahifasida qoladi. */
export const alertRoute = (code: string): PanelRouteKey => CATEGORY_ROUTE[alertCategory(code)] ?? "alerts";

export const KNOWN_ALERT_CATEGORIES = Object.keys(CATEGORY_ROUTE);
