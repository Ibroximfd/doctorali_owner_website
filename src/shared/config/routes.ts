/** Barcha yo'llar bitta joyda — kodda satr literal yo'l yozilmaydi. */
export const routes = {
  login: "/login",
  overview: "/",
  filials: "/filials",
  finance: "/finance",
  analytics: "/analytics",
  app: "/app",
  staff: "/staff",
  warehouse: "/warehouse",
  ai: "/ai",
  settings: "/settings",
} as const;

export type RouteKey = keyof typeof routes;
export type PanelRouteKey = Exclude<RouteKey, "login">;

/** Global filtr (davr · filial) ko'rsatilmaydigan sahifalar. */
export const ROUTES_WITHOUT_SCOPE: readonly PanelRouteKey[] = [
  // hozirgi holat bilan ishlaydi (davr filtri ma'nosiz)
  "ai",
  "settings",
];

/**
 * Faqat davr filtri bor sahifalar: filial va taqqoslash tanlovi ma'nosiz yoki chalg'itadi
 * (sklad hamma filial uchun bitta; ilova foydalanuvchisi filialga tegishli emas — filiallar
 * kesimi sahifaning o'zida).
 */
export const ROUTES_PERIOD_ONLY: readonly PanelRouteKey[] = ["warehouse", "app"];

export const routeKeyOf = (pathname: string): PanelRouteKey => {
  const match = (Object.keys(routes) as RouteKey[]).find(
    (key) =>
      key !== "login" &&
      key !== "overview" &&
      (pathname === routes[key] || pathname.startsWith(`${routes[key]}/`)),
  );
  return match && match !== "login" ? match : "overview";
};

/** Sessiya tugaganda — kirish sahifasi, kirgandan keyin shu yerga qaytish manzili bilan. */
export const signInHref = (next: string): string => `${routes.login}?next=${encodeURIComponent(next)}`;
