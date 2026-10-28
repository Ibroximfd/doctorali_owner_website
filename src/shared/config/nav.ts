import {
  Bell,
  Building2,
  FileText,
  Headset,
  LayoutDashboard,
  Leaf,
  Package,
  SlidersHorizontal,
  Trophy,
  Smartphone,
  Stethoscope,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import {
  AccessIcon,
  AiIcon,
  ForecastIcon,
  IssuesIcon,
  SettlementsIcon,
  SystemIcon,
  WarehouseIcon,
  type IconComponent,
} from "@/shared/ui/icons/brand-icons";

import type { PanelRouteKey } from "./routes";

export type NavGroupKey = "main" | "business" | "growth" | "control";

export type NavItem = {
  route: PanelRouteKey;
  /** lucide yoki brend ikonkasi — ikkalasi bir xil API da. */
  icon: IconComponent;
  group: NavGroupKey;
  /** Ochiq signallar soni shu element yonida ko'rsatiladi. */
  showsAlerts?: boolean;
};

/** Yorliqlar `nav` tarjima nomlar fazosidan olinadi: `nav.items.<route>`, `nav.groups.<group>`. */
export const NAV_ITEMS: readonly NavItem[] = [
  { route: "overview", icon: LayoutDashboard, group: "main" },
  { route: "issues", icon: IssuesIcon, group: "main" },
  { route: "ai", icon: AiIcon, group: "main" },
  { route: "forecast", icon: ForecastIcon, group: "main" },
  { route: "orders", icon: Package, group: "business" },
  { route: "finance", icon: Wallet, group: "business" },
  { route: "clinic", icon: Building2, group: "business" },
  { route: "logistics", icon: Truck, group: "business" },
  { route: "warehouse", icon: WarehouseIcon, group: "business" },
  { route: "settlements", icon: SettlementsIcon, group: "business" },
  { route: "staff", icon: Trophy, group: "business" },
  { route: "sales", icon: Headset, group: "business" },
  { route: "app", icon: Smartphone, group: "growth" },
  { route: "products", icon: Leaf, group: "growth" },
  { route: "customers", icon: Users, group: "growth" },
  { route: "doctors", icon: Stethoscope, group: "growth" },
  { route: "alerts", icon: Bell, group: "control", showsAlerts: true },
  { route: "reports", icon: FileText, group: "control" },
  { route: "system", icon: SystemIcon, group: "control" },
  { route: "access", icon: AccessIcon, group: "control" },
  { route: "settings", icon: SlidersHorizontal, group: "control" },
];

export const NAV_GROUPS: readonly NavGroupKey[] = ["main", "business", "growth", "control"];

/** Telefonda pastki tab-bar; qolganlari "Yana" varag'ida. */
export const TAB_ROUTES: readonly PanelRouteKey[] = ["overview", "issues", "orders", "alerts"];

/**
 * Foydalanuvchiga ko'rinadigan bo'limlar. `allowed` — `me.sections`: **bo'sh = hammasi
 * ochiq** (biznes egasi), to'lgan bo'lsa faqat sanalganlari (`API_QOLLANMA` §2.2).
 */
export const visibleNavItems = (allowed: readonly string[]): NavItem[] =>
  NAV_ITEMS.filter((item) => allowed.length === 0 || allowed.includes(item.route));

export const isRouteAllowed = (route: PanelRouteKey, allowed: readonly string[]): boolean =>
  allowed.length === 0 || allowed.includes(route);
