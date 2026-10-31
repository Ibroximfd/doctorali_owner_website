import {
  Building2,
  ChartColumnBig,
  LayoutDashboard,
  SlidersHorizontal,
  Smartphone,
  Trophy,
  Wallet,
} from "lucide-react";

import { AiIcon, WarehouseIcon, type IconComponent } from "@/shared/ui/icons/brand-icons";

import type { PanelRouteKey } from "./routes";

export type NavGroupKey = "main" | "control";

export type NavItem = {
  route: PanelRouteKey;
  /** lucide yoki brend ikonkasi — ikkalasi bir xil API da. */
  icon: IconComponent;
  group: NavGroupKey;
};

/**
 * Tuzilma v2 (`mehrigiyo_platform_tz/21` §12): boshqaruv va nazorat — 9 bo'lim (8 + «Ilova», egasi talabi).
 * Yorliqlar `nav` tarjima nomlar fazosidan olinadi: `nav.items.<route>`, `nav.groups.<group>`.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { route: "overview", icon: LayoutDashboard, group: "main" },
  { route: "filials", icon: Building2, group: "main" },
  { route: "finance", icon: Wallet, group: "main" },
  { route: "analytics", icon: ChartColumnBig, group: "main" },
  { route: "app", icon: Smartphone, group: "main" },
  { route: "staff", icon: Trophy, group: "main" },
  { route: "warehouse", icon: WarehouseIcon, group: "main" },
  { route: "ai", icon: AiIcon, group: "control" },
  { route: "settings", icon: SlidersHorizontal, group: "control" },
];

export const NAV_GROUPS: readonly NavGroupKey[] = ["main", "control"];

/** Telefonda pastki tab-bar; qolganlari "Yana" varag'ida. */
export const TAB_ROUTES: readonly PanelRouteKey[] = ["overview", "filials", "finance", "warehouse"];

/**
 * Foydalanuvchiga ko'rinadigan bo'limlar. `allowed` — `me.sections`: **bo'sh = hammasi
 * ochiq** (biznes egasi), to'lgan bo'lsa faqat sanalganlari (`API_QOLLANMA` §2.2).
 */
export const visibleNavItems = (allowed: readonly string[]): NavItem[] =>
  NAV_ITEMS.filter((item) => allowed.length === 0 || allowed.includes(item.route));

export const isRouteAllowed = (route: PanelRouteKey, allowed: readonly string[]): boolean =>
  allowed.length === 0 || allowed.includes(route);
