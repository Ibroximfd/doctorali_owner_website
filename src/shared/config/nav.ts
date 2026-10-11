import {
  Bell,
  Building2,
  FileText,
  Headset,
  Layers,
  LayoutDashboard,
  Leaf,
  Package,
  SlidersHorizontal,
  Smartphone,
  Stethoscope,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { PanelRouteKey } from "./routes";

export type NavGroupKey = "main" | "business" | "growth" | "control" | "design";

export type NavItem = {
  route: PanelRouteKey;
  icon: LucideIcon;
  group: NavGroupKey;
  /** Ochiq signallar soni shu element yonida ko'rsatiladi. */
  showsAlerts?: boolean;
  /** Faqat namuna (mock) rejimida ko'rinadi. */
  mockOnly?: boolean;
};

/** Yorliqlar `nav` tarjima nomlar fazosidan olinadi: `nav.items.<route>`, `nav.groups.<group>`. */
export const NAV_ITEMS: readonly NavItem[] = [
  { route: "overview", icon: LayoutDashboard, group: "main" },
  { route: "orders", icon: Package, group: "business" },
  { route: "finance", icon: Wallet, group: "business" },
  { route: "clinic", icon: Building2, group: "business" },
  { route: "logistics", icon: Truck, group: "business" },
  { route: "sales", icon: Headset, group: "business" },
  { route: "app", icon: Smartphone, group: "growth" },
  { route: "products", icon: Leaf, group: "growth" },
  { route: "customers", icon: Users, group: "growth" },
  { route: "doctors", icon: Stethoscope, group: "growth" },
  { route: "alerts", icon: Bell, group: "control", showsAlerts: true },
  { route: "reports", icon: FileText, group: "control" },
  { route: "settings", icon: SlidersHorizontal, group: "control" },
  { route: "states", icon: Layers, group: "design", mockOnly: true },
];

export const NAV_GROUPS: readonly NavGroupKey[] = ["main", "business", "growth", "control", "design"];

/** Telefonda pastki tab-bar; qolganlari "Yana" varag'ida. */
export const TAB_ROUTES: readonly PanelRouteKey[] = ["overview", "orders", "finance", "alerts"];

/**
 * Foydalanuvchiga ko'rinadigan bo'limlar. `allowed` — `me.sections`: **bo'sh = hammasi
 * ochiq** (biznes egasi), to'lgan bo'lsa faqat sanalganlari (`API_QOLLANMA` §2.2).
 */
export const visibleNavItems = (allowed: readonly string[], isMocking: boolean): NavItem[] =>
  NAV_ITEMS.filter(
    (item) =>
      (!item.mockOnly || isMocking) &&
      (allowed.length === 0 || item.mockOnly || allowed.includes(item.route)),
  );

export const isRouteAllowed = (route: PanelRouteKey, allowed: readonly string[]): boolean =>
  allowed.length === 0 ||
  allowed.includes(route) ||
  NAV_ITEMS.some((item) => item.route === route && item.mockOnly);
