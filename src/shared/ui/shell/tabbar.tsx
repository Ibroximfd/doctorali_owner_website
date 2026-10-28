"use client";

import { Ellipsis } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { TAB_ROUTES, visibleNavItems } from "@/shared/config/nav";
import { routes, type PanelRouteKey } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";

import { ScopeLink } from "../scope-link";
import { Sheet } from "../sheet";

type TabbarProps = { activeRoute: PanelRouteKey; alertsCount: number; allowedSections: readonly string[] };

/** Telefon: 4 ta asosiy bo'lim + "Yana" (qolgan bo'limlar varag'i). Teginish nishoni ≥ 44px. */
export const Tabbar = ({ activeRoute, alertsCount, allowedSections }: TabbarProps) => {
  const t = useTranslations("nav");
  const [isMoreOpen, setMoreOpen] = useState(false);

  const visible = visibleNavItems(allowedSections);
  const tabs = visible.filter((item) => TAB_ROUTES.includes(item.route));
  const rest = visible.filter((item) => !TAB_ROUTES.includes(item.route));
  const isRestActive = rest.some((item) => item.route === activeRoute);
  const tabClass =
    "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-2xs font-mid";

  return (
    <>
      <nav
        aria-label={t("quick")}
        className="bg-bg/85 fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden"
      >
        {tabs.map((item) => {
          const isActive = item.route === activeRoute;
          return (
            <ScopeLink
              key={item.route}
              href={routes[item.route]}
              aria-current={isActive ? "page" : undefined}
              className={cn(tabClass, isActive ? "text-accent" : "text-ink-3")}
            >
              <item.icon aria-hidden className="size-5" strokeWidth={1.75} />
              {item.showsAlerts && alertsCount > 0 ? (
                <span className="num bg-crit text-2xs text-accent-ink absolute top-0 left-1/2 ml-1 min-w-4 rounded-full px-1 text-center leading-tight font-semibold">
                  {alertsCount}
                </span>
              ) : null}
              <span className="max-w-full truncate">{t(`items.${item.route}`)}</span>
            </ScopeLink>
          );
        })}
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setMoreOpen(true)}
          className={cn(tabClass, isRestActive ? "text-accent" : "text-ink-3")}
        >
          <Ellipsis aria-hidden className="size-5" strokeWidth={1.75} />
          <span>{t("more")}</span>
        </button>
      </nav>

      <Sheet open={isMoreOpen} onOpenChange={setMoreOpen} title={t("moreTitle")}>
        <div className="grid grid-cols-3 gap-2">
          {rest.map((item) => {
            const isActive = item.route === activeRoute;
            return (
              <ScopeLink
                key={item.route}
                href={routes[item.route]}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "font-mid flex flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-3.5 text-center text-xs",
                  isActive ? "bg-accent-soft text-accent border-transparent" : "text-ink-2",
                )}
              >
                <item.icon aria-hidden className="size-5" strokeWidth={1.75} />
                {t(`items.${item.route}`)}
              </ScopeLink>
            );
          })}
        </div>
      </Sheet>
    </>
  );
};
