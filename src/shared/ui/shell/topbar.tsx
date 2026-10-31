"use client";

import { LogOut, Moon, PanelLeft, Search, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { routes, type PanelRouteKey } from "@/shared/config/routes";

import { ScopeLink } from "../scope-link";
import { BrandMark } from "./brand";

type TopbarProps = {
  activeRoute: PanelRouteKey;
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onLogout: () => void;
};

const iconButton =
  "relative grid size-9 shrink-0 place-items-center rounded-xl text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink";

export const Topbar = ({ activeRoute, onToggleSidebar, onOpenSearch, onLogout }: TopbarProps) => {
  const t = useTranslations("nav");
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="bg-bg/85 sticky top-0 z-20 flex h-15 items-center gap-1.5 border-b px-4 backdrop-blur-md md:gap-2.5 md:px-6">
      <ScopeLink href={routes.overview} aria-label={t("home")} className="md:hidden">
        <BrandMark className="size-7.5" />
      </ScopeLink>
      <button
        type="button"
        aria-label={t("toggleSidebar")}
        onClick={onToggleSidebar}
        className={`${iconButton} max-xl:hidden`}
      >
        <PanelLeft aria-hidden className="size-4.5" strokeWidth={1.75} />
      </button>
      <div className="font-display min-w-0 truncate text-lg">{t(`items.${activeRoute}`)}</div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onOpenSearch}
        className="bg-surface/50 text-ink-3 hover:border-border-strong flex h-9.5 w-72 items-center gap-2 rounded-xl border px-3 text-sm transition-colors max-lg:hidden"
      >
        <Search aria-hidden className="size-3.5" />
        <span>{t("search")}</span>
        <kbd className="num border-border-strong text-2xs ml-auto rounded-md border px-1.5">⌘K</kbd>
      </button>
      <button
        type="button"
        aria-label={t("search")}
        onClick={onOpenSearch}
        className={`${iconButton} lg:hidden`}
      >
        <Search aria-hidden className="size-4.5" strokeWidth={1.75} />
      </button>

      <button
        type="button"
        aria-label={t("toggleTheme")}
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className={iconButton}
      >
        {/* Ikkala ikon ham chiziladi; qaysi biri ko'rinishini CSS hal qiladi — gidratsiya farqi bo'lmaydi. */}
        <Moon aria-hidden className="size-4.5 dark:hidden" strokeWidth={1.75} />
        <Sun aria-hidden className="hidden size-4.5 dark:block" strokeWidth={1.75} />
      </button>

      <button type="button" aria-label={t("logout")} onClick={onLogout} className={iconButton}>
        <LogOut aria-hidden className="size-4.5" strokeWidth={1.75} />
      </button>
    </header>
  );
};
