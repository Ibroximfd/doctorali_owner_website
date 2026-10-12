/** Barcha yo'llar bitta joyda — kodda satr literal yo'l yozilmaydi. */
export const routes = {
  login: "/login",
  overview: "/",
  orders: "/orders",
  finance: "/finance",
  clinic: "/clinic",
  logistics: "/logistics",
  sales: "/sales",
  app: "/app",
  products: "/products",
  customers: "/customers",
  doctors: "/doctors",
  alerts: "/alerts",
  reports: "/reports",
  settings: "/settings",
} as const;

/**
 * Telegram mini app kirish nuqtasi (bot tugmasi shu manzilni ochadi). Panel
 * bo'limi emas — navigatsiyada yo'q, shuning uchun `routes` dan tashqarida.
 */
export const TELEGRAM_ENTRY = "/tg";

export type RouteKey = keyof typeof routes;
export type PanelRouteKey = Exclude<RouteKey, "login">;

/** Global filtr (davr · filial) ko'rsatilmaydigan sahifalar. */
export const ROUTES_WITHOUT_SCOPE: readonly PanelRouteKey[] = ["alerts", "reports", "settings"];

export const routeKeyOf = (pathname: string): PanelRouteKey => {
  const match = (Object.keys(routes) as RouteKey[]).find(
    (key) =>
      key !== "login" &&
      key !== "overview" &&
      (pathname === routes[key] || pathname.startsWith(`${routes[key]}/`)),
  );
  return match && match !== "login" ? match : "overview";
};
