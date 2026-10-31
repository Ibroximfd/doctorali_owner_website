"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";

import { useLogout, useMeQuery } from "@/features/auth/hooks/use-auth";
import { isRouteAllowed, visibleNavItems } from "@/shared/config/nav";
import { routeKeyOf, routes } from "@/shared/config/routes";
import { useLiveChannel } from "@/shared/hooks/use-live-channel";
import { useSessionStore } from "@/shared/stores/session-store";
import { AppShell } from "@/shared/ui/shell/app-shell";

/**
 * Kompozitsiya nuqtasi: qobiq (`shared`) foydalanuvchini o'zi yuklamaydi —
 * u shu yerda, `auth` featuresidan olinib beriladi.
 */
export const PanelShell = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("nav");
  const me = useMeQuery().data;
  const logout = useLogout();
  const allowedSections = me?.sections ?? [];
  useRedirectToAllowedSection(allowedSections);
  const isViewer = me?.role === "owner_viewer";
  const setCanAct = useSessionStore((state) => state.setCanAct);
  useEffect(() => setCanAct(!isViewer), [isViewer, setCanAct]);

  useLiveChannel();
  // Saytda harakatsizlik uchun chiqarilmaydi: boshliq qarori — bir marta kirgach sessiya eslab
  // qolinadi (refresh 14 kun, har kirishda yangilanadi).

  return (
    <AppShell
      userName={me?.fullName ?? t("userFallback")}
      userRole={t(me?.role === "owner_viewer" ? "roles.viewer" : "roles.owner")}
      onLogout={() => logout.mutate()}
      allowedSections={allowedSections}
    >
      {children}
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
    const first = visibleNavItems(allowed)[0];
    if (first) router.replace(routes[first.route]);
  }, [allowed, pathname, router]);
};
