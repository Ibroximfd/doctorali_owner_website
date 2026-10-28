"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { QueryState } from "@/shared/ui/states";

import { useAccountsQuery, useDepartmentsQuery, useRolesQuery } from "../hooks/use-iam";
import { roleCounts } from "../model/iam.rules";

/** Rangli urg'u navbati (tokenlar): plitkadagi son va chegara. */
const TONES = [
  "text-gold border-gold/20",
  "text-accent border-accent/20",
  "text-info border-info/20",
  "text-ember border-ember/20",
] as const;

/** Shablonlar (rol) plitkalari: nechta akkauntga berilgan va qaysi bo'lim. Bosilsa — o'sha bo'lim filtri. */
export const RoleTiles = ({
  department,
  onDepartment,
}: {
  department: string | null;
  onDepartment: (department: string | null) => void;
}) => {
  const t = useTranslations("access.tiles");
  const accounts = useAccountsQuery(null, "");
  const roles = useRolesQuery().data ?? [];
  const departments = useDepartmentsQuery().data ?? [];
  const reduce = useReducedMotion();

  return (
    <QueryState
      query={accounts}
      skeleton={<div className="skeleton mb-4 h-20 w-full rounded-2xl" />}
      isEmpty={(rows) => roleCounts(roles, rows).length === 0}
      empty={<></>}
    >
      {(rows) => (
        <section aria-label={t("label")} className="mb-4">
          <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {roleCounts(roles, rows).map(({ role, count }, index) => {
              const pressed = department === role.department;
              return (
                <motion.li
                  key={role.key}
                  initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.1 + Math.min(index, 8) * 0.05 }}
                >
                  <button
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => onDepartment(pressed ? null : role.department)}
                    className={cn(
                      "panel-surface flex h-full w-full flex-col rounded-2xl border p-4 text-left transition-colors",
                      TONES[index % TONES.length],
                      pressed && "bg-accent-soft border-accent/40",
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-ink truncate text-sm font-bold">{role.title}</span>
                      <span className="num shrink-0 text-xl font-semibold">{formatNumber(count)}</span>
                    </span>
                    <span className="text-ink-3 mt-1 truncate text-xs">
                      {departments.find((item) => item.key === role.department)?.title ?? role.department}
                      {" · "}
                      {t("permissions", { count: role.permissions.length })}
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </section>
      )}
    </QueryState>
  );
};
