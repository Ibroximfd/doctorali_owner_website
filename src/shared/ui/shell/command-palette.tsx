"use client";

import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { visibleNavItems } from "@/shared/config/nav";
import { routes } from "@/shared/config/routes";
import { useScopedHref } from "@/shared/hooks/use-scope";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowedSections: readonly string[];
};

const itemClass =
  "flex h-10 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm text-ink-2 data-[selected=true]:bg-surface-3 data-[selected=true]:text-ink";

/** ⌘K: bo'limga o'tish yoki buyurtmalardan qidirish (raqam, telefon, ism). */
export const CommandPalette = ({ open, onOpenChange, allowedSections }: CommandPaletteProps) => {
  const t = useTranslations("nav");
  const router = useRouter();
  const scopedHref = useScopedHref();
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const go = (href: string) => {
    onOpenChange(false);
    setQuery("");
    // Yon paneldagi havolalardek: tanlangan davr va filial saqlanadi.
    router.push(scopedHref(href));
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-scrim data-[state=open]:animate-in data-[state=open]:fade-in fixed inset-0 z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="bg-surface shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in fixed top-[12vh] left-1/2 z-50 w-[min(35rem,calc(100%-2rem))] -translate-x-1/2 overflow-hidden rounded-3xl border"
        >
          <Dialog.Title className="sr-only">{t("search")}</Dialog.Title>
          <Command label={t("search")} shouldFilter>
            <div className="flex items-center gap-2.5 border-b px-4">
              <Search aria-hidden className="text-ink-3 size-4 shrink-0" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder={t("searchPlaceholder")}
                className="text-md placeholder:text-ink-3 h-12.5 w-full bg-transparent outline-none"
              />
            </div>
            <Command.List className="max-h-[50vh] overflow-y-auto p-1.5">
              <Command.Group
                heading={t("sections")}
                className="[&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:font-semibold"
              >
                {visibleNavItems(allowedSections).map((item) => (
                  <Command.Item
                    key={item.route}
                    value={t(`items.${item.route}`)}
                    onSelect={() => go(routes[item.route])}
                    className={itemClass}
                  >
                    <item.icon aria-hidden className="size-4" strokeWidth={1.75} />
                    {t(`items.${item.route}`)}
                  </Command.Item>
                ))}
              </Command.Group>
              {/*
                Qidiruv amali ro'yxat oxirida va `value` so'rovga mos kelmaydi: bo'lim nomi
                yozilsa Enter o'sha bo'limga olib boradi, mos bo'lim bo'lmasa — buyurtmalar qidiruviga.
              */}
              {trimmed === "" ? null : (
                <Command.Group forceMount>
                  <Command.Item
                    value="orders-search-action"
                    forceMount
                    onSelect={() => go(`${routes.orders}?q=${encodeURIComponent(trimmed)}`)}
                    className={itemClass}
                  >
                    <Search aria-hidden className="size-4" />
                    {t("searchOrders", { query: trimmed })}
                  </Command.Item>
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
