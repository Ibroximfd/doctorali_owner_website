"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";

import { useOpenAlertsCount } from "@/features/alerts/hooks/use-alerts-query";
import { useLogout, useMeQuery } from "@/features/auth/hooks/use-auth";
import { OrderDrawer } from "@/features/orders/ui/order-drawer";
import { TelegramRuntime } from "@/features/telegram/ui/telegram-runtime";
import { env } from "@/shared/config/env";
import { isRouteAllowed, visibleNavItems } from "@/shared/config/nav";
import { routeKeyOf, routes } from "@/shared/config/routes";
import { useLiveChannel } from "@/shared/hooks/use-live-channel";
import { AppShell } from "@/shared/ui/shell/app-shell";

/**
 * Kompozitsiya nuqtasi: qobiq (`shared`) signal soni va foydalanuvchini o'zi
 * yuklamaydi — ular shu yerda, featurelardan olinib beriladi.
 */
export const PanelShell = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("nav");
  const alertsCount = useOpenAlertsCount();
  const me = useMeQuery().data;
  const logout = useLogout();
  const allowedSections = me?.sections ?? [];
  useRedirectToAllowedSection(allowedSections);

  useLiveChannel();
  // Saytda harakatsizlik uchun chiqarilmaydi: boshliq qarori — bir marta kirgach sessiya eslab
  // qolinadi (refresh 14 kun, har kirishda yangilanadi). Telegramda qulf alohida (`TelegramRuntime`).

  return (
    <AppShell
      alertsCount={alertsCount}
      userName={me?.fullName ?? t("userFallback")}
      userRole={t(me?.role === "owner_viewer" ? "roles.viewer" : "roles.owner")}
      onLogout={() => logout.mutate()}
      allowedSections={allowedSections}
    >
      {children}
      {/* Buyurtma kartasi istalgan bo'limdan `?order=<id>` orqali ochiladi. */}
      <OrderDrawer />
      {/* Telegram mini app ichida: mavzu, «orqaga» tugmasi, fonda qolsa — PIN qayta. */}
      <TelegramRuntime onLock={() => logout.mutate()} />
    </AppShell>
  );
};

/**
 * Cheklangan ko'ruvchi (`owner_viewer`) yopiq bo'limga havola orqali kelsa — birinchi
 * ochiq bo'limga o'tkaziladi (aks holda sahifa «ruxsat yo'q» bloklari bilan to'ladi).
 */
const useRedirectToAllowedSection = (allowed: readonly string[]) => {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (allowed.length === 0 || isRouteAllowed(routeKeyOf(pathname), allowed)) return;
    const first = visibleNavItems(allowed, env.isMocking)[0];
    if (first) router.replace(routes[first.route]);
  }, [allowed, pathname, router]);
};
