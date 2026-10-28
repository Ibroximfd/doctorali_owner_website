"use client";

import { CircleDot } from "lucide-react";
import { useTranslations } from "next-intl";

import { NAV_ITEMS } from "@/shared/config/nav";
import { cn } from "@/shared/lib/cn";

/** Bo'lim belgisi: menyudagi ikonka va nom — boshliq qaysi bo'lim ekanini darhol taniydi. */
export const SectionChip = ({ section, className }: { section: string; className?: string }) => {
  const t = useTranslations("nav.items");
  const item = NAV_ITEMS.find((navItem) => navItem.route === section);
  const Icon = item?.icon ?? CircleDot;
  return (
    <span
      className={cn(
        "bg-accent-soft text-accent inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={2} />
      {item ? t(item.route) : section}
    </span>
  );
};
