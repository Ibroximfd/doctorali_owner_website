"use client";

import { useTranslations } from "next-intl";

import { NAV_GROUPS, visibleNavItems } from "@/shared/config/nav";
import { routes, type PanelRouteKey } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { initialsOf } from "@/shared/lib/format";

import { ScopeLink } from "../scope-link";
import { BrandMark } from "./brand";

type SidebarProps = {
  /** `me.sections`: bo\'sh — barcha bo\'limlar. */
  allowedSections: readonly string[];
  activeRoute: PanelRouteKey;
  alertsCount: number;
  isCollapsed: boolean;
  userName: string;
  userRole: string;
};

/**
 * Yon panel: ≥1280px da to'liq (yig'ish mumkin), 768–1279px da ikon-rels,
 * telefonda yashirin (o'rniga pastki tab-bar).
 */
export const Sidebar = ({
  activeRoute,
  alertsCount,
  isCollapsed,
  userName,
  userRole,
  allowedSections,
}: SidebarProps) => {
  const t = useTranslations("nav");
  // Yorliqlar faqat to'liq holatda ko'rinadi.
  const labelClass = isCollapsed ? "hidden" : "max-xl:hidden";
  const items = visibleNavItems(allowedSections);

  return (
    <aside
      className={cn(
        "bg-surface sticky top-0 z-30 flex h-dvh w-16 shrink-0 flex-col border-r max-md:hidden",
        !isCollapsed && "xl:w-62",
      )}
    >
      <ScopeLink
        href={routes.overview}
        aria-label={t("home")}
        className={cn(
          "flex h-14 shrink-0 items-center gap-2.5 max-xl:justify-center",
          isCollapsed ? "justify-center" : "xl:px-4",
        )}
      >
        <BrandMark />
        <span className={cn("leading-tight", labelClass)}>
          <span className="text-md font-strong block whitespace-nowrap">Doctor Ali</span>
          <span className="text-2xs text-ink-3 block font-medium tracking-wide">{t("product")}</span>
        </span>
      </ScopeLink>

      <nav
        aria-label={t("label")}
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3 xl:px-2.5"
      >
        {NAV_GROUPS.map((group) => {
          const groupItems = items.filter((item) => item.group === group);
          if (groupItems.length === 0) return null;
          return (
            <div key={group} className="flex flex-col gap-0.5">
              {group === "main" ? null : (
                <div
                  className={cn(
                    "text-2xs text-ink-3 px-2.5 pt-3.5 pb-1.5 font-semibold tracking-widest uppercase",
                    labelClass,
                  )}
                >
                  {t(`groups.${group}`)}
                </div>
              )}
              {groupItems.map((item) => {
                const isActive = item.route === activeRoute;
                const showCount = item.showsAlerts && alertsCount > 0;
                return (
                  <ScopeLink
                    key={item.route}
                    href={routes[item.route]}
                    title={t(`items.${item.route}`)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 items-center gap-2.5 rounded-md text-sm font-medium whitespace-nowrap max-xl:justify-center xl:h-9",
                      isCollapsed ? "justify-center" : "xl:px-2.5",
                      isActive
                        ? "bg-accent-soft text-accent font-semibold"
                        : "text-ink-2 hover:bg-surface-3 hover:text-ink",
                    )}
                  >
                    <item.icon aria-hidden className="size-4.5 shrink-0" strokeWidth={1.75} />
                    <span className={labelClass}>{t(`items.${item.route}`)}</span>
                    {showCount ? (
                      <span
                        className={cn(
                          "num bg-crit text-2xs text-surface rounded-full text-center font-semibold",
                          isCollapsed
                            ? "absolute top-0.5 right-1 min-w-4 px-1"
                            : "max-xl:absolute max-xl:top-0.5 max-xl:right-1 max-xl:min-w-4 max-xl:px-1 xl:ml-auto xl:min-w-5 xl:px-1.5 xl:py-0.5",
                        )}
                      >
                        {alertsCount}
                      </span>
                    ) : null}
                  </ScopeLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div
        className={cn(
          "flex shrink-0 items-center gap-2.5 border-t p-2.5 max-xl:justify-center",
          isCollapsed && "justify-center",
        )}
      >
        <span
          aria-hidden
          className="bg-surface-3 font-strong text-ink-2 grid size-8 shrink-0 place-items-center rounded-full text-xs"
        >
          {initialsOf(userName)}
        </span>
        <div className={cn("min-w-0 leading-tight", labelClass)}>
          <div className="truncate text-sm font-semibold">{userName}</div>
          <div className="text-2xs text-ink-3 truncate">{userRole}</div>
        </div>
      </div>
    </aside>
  );
};
