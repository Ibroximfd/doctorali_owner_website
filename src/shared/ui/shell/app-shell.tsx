"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { ROUTES_WITHOUT_SCOPE, routeKeyOf } from "@/shared/config/routes";
import { useUiStore } from "@/shared/stores/ui-store";

import { AmbientBackground } from "../ambient-background";
import { MobileScope, ScopeBar } from "../scope/scope-bar";
import { OfflineBanner } from "../states";
import { CommandPalette } from "./command-palette";
import { Sidebar } from "./sidebar";
import { Tabbar } from "./tabbar";
import { Topbar } from "./topbar";

type AppShellProps = {
  alertsCount: number;
  userName: string;
  userRole: string;
  onLogout: () => void;
  /** `me.sections` — bo'sh yoki berilmagan: barcha bo'limlar ochiq. */
  allowedSections?: readonly string[];
  children: ReactNode;
};

/**
 * Panel qobig'i: yon panel + yuqori panel + filtr qatori + kontent. Telefonda
 * yon panel o'rniga pastki tab-bar. Ma'lumotni o'zi yuklamaydi — signal soni va
 * foydalanuvchi `app` qatlamidan beriladi.
 */
export const AppShell = ({
  alertsCount,
  userName,
  userRole,
  onLogout,
  allowedSections = [],
  children,
}: AppShellProps) => {
  const activeRoute = routeKeyOf(usePathname());
  const isSidebarCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const hasScope = !ROUTES_WITHOUT_SCOPE.includes(activeRoute);

  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <AmbientBackground />
      <Sidebar
        activeRoute={activeRoute}
        alertsCount={alertsCount}
        isCollapsed={isSidebarCollapsed}
        userName={userName}
        userRole={userRole}
        allowedSections={allowedSections}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          activeRoute={activeRoute}
          alertsCount={alertsCount}
          onToggleSidebar={toggleSidebar}
          onOpenSearch={() => setSearchOpen(true)}
          onLogout={onLogout}
        />
        <OfflineBanner className="px-4 pt-3 md:px-6" />
        {hasScope ? (
          <>
            <ScopeBar />
            <MobileScope />
          </>
        ) : null}
        <main className="mx-auto w-full max-w-400 px-4 pt-3.5 pb-24 md:px-6 md:pt-4.5 md:pb-10">
          {children}
        </main>
      </div>
      <Tabbar activeRoute={activeRoute} alertsCount={alertsCount} allowedSections={allowedSections} />
      <CommandPalette open={isSearchOpen} onOpenChange={setSearchOpen} allowedSections={allowedSections} />
    </div>
  );
};
