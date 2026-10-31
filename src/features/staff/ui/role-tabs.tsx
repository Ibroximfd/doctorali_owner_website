"use client";

import { motion } from "motion/react";
import { Headset, Route, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";

import { useStaffView } from "../hooks/use-staff";
import { STAFF_ROLES, type StaffRole } from "../model/staff.rules";

const ROLE_ICON: Record<StaffRole, LucideIcon> = {
  operator: Headset,
  logist: Route,
};

/** Rol varaqlari (bo'lim boshida) — faol belgi yumshoq yalpiz «tabletka» bo'lib oqib o'tadi. */
export const RoleTabs = () => {
  const t = useTranslations("staff.roles");
  const tBoard = useTranslations("staff.board");
  const { role, setRole } = useStaffView();
  return (
    <div
      role="tablist"
      aria-label={tBoard("roles")}
      className="bg-surface-2/60 fade-mask-x flex max-w-full gap-1 overflow-x-auto rounded-2xl border p-1"
    >
      {STAFF_ROLES.map((key) => {
        const Icon = ROLE_ICON[key];
        const isActive = key === role;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setRole(key)}
            className={cn(
              "relative flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-colors",
              isActive ? "text-accent" : "text-ink-2 hover:text-ink",
            )}
          >
            {isActive ? (
              <motion.span
                aria-hidden
                layoutId="staff-role"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="bg-accent/15 absolute inset-0 rounded-xl"
              />
            ) : null}
            <Icon aria-hidden className="relative size-4" />
            <span className="relative">{t(key)}</span>
          </button>
        );
      })}
    </div>
  );
};
