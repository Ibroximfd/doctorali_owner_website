"use client";

import { motion } from "motion/react";
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
  isCollapsed: boolean;
  userName: string;
  userRole: string;
};

/**
 * Yon panel: ≥1280px da to'liq (yig'ish mumkin), 768–1279px da ikon-rels,
 * telefonda yashirin (o'rniga pastki tab-bar).
 */
export const Sidebar = ({ activeRoute, isCollapsed, userName, userRole, allowedSections }: SidebarProps) => {
  const t = useTranslations("nav");
  // Yorliqlar faqat to'liq holatda ko'rinadi.
  const labelClass = isCollapsed ? "hidden" : "max-xl:hidden";
  const items = visibleNavItems(allowedSections);

  return (
    <aside
      className={cn(
        "from-surface to-bg sticky top-0 z-30 flex h-dvh w-16 shrink-0 flex-col border-r bg-gradient-to-b max-md:hidden",
        !isCollapsed && "xl:w-62",
      )}
    >
      <ScopeLink
        href={routes.overview}
        aria-label={t("home")}
        className={cn(
          "flex h-18 shrink-0 items-center gap-3 max-xl:justify-center",
          isCollapsed ? "justify-center" : "xl:px-5",
        )}
      >
        <BrandMark className="shadow-glow size-9 rounded-xl shadow-lg" />
        <span className={cn("leading-tight", labelClass)}>
          <span className="font-display block text-xl whitespace-nowrap">Doctor Ali</span>
          <span className="text-2xs text-ink-3 block font-medium">{t("product")}</span>
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
                <div className={cn("text-2xs text-ink-3 px-3 pt-4.5 pb-1.5 font-semibold", labelClass)}>
                  {t(`groups.${group}`)}
                </div>
              )}
              {groupItems.map((item) => {
                const isActive = item.route === activeRoute;
                return (
                  <ScopeLink
                    key={item.route}
                    href={routes[item.route]}
                    title={t(`items.${item.route}`)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 items-center gap-3 rounded-xl text-sm font-medium whitespace-nowrap max-xl:justify-center xl:h-9.5",
                      isCollapsed ? "justify-center" : "xl:px-3",
                      isActive ? "text-ink font-bold" : "text-ink-2 hover:bg-surface-3/60 hover:text-ink",
                    )}
                  >
                    {/* faol belgi bo'limlar orasida «oqib» o'tadi */}
                    {isActive ? (
                      <motion.span
                        aria-hidden
                        layoutId="nav-active"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        className="from-accent/16 to-accent/3 ring-accent/22 absolute inset-0 rounded-xl bg-gradient-to-r ring-1 ring-inset"
                      />
                    ) : null}
                    <item.icon aria-hidden className="relative size-4.5 shrink-0" strokeWidth={1.75} />
                    <span className={cn("relative", labelClass)}>{t(`items.${item.route}`)}</span>
                  </ScopeLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div
        className={cn(
          "flex shrink-0 items-center gap-2.5 border-t px-3 py-3.5 max-xl:justify-center xl:px-4.5",
          isCollapsed && "justify-center",
        )}
      >
        <span
          aria-hidden
          className="from-gold to-gold/50 text-accent-ink font-strong grid size-8.5 shrink-0 place-items-center rounded-full bg-gradient-to-br text-xs"
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
