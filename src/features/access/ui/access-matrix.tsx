"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

import { cn } from "@/shared/lib/cn";
import { initialsOf } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useAccessTab, useAccountDetails, usePermissionsQuery, useRolesQuery } from "../hooks/use-iam";
import {
  PERMISSION_LEVELS,
  effectivePermissions,
  groupByModule,
  moduleLevels,
  type PermissionLevel,
} from "../model/iam.rules";
import type { Account, PermissionDef } from "../model/iam.schema";

/** Matritsada bir vaqtda ko'rsatiladigan akkauntlar (har biriga tafsilot so'raladi). */
export const MATRIX_LIMIT = 12;

/** Daraja belgisi: ko'rish — moviy, tafsilot — yalpiz, maxfiy — tilla, amal va boshqaruv — to'liq rang. */
const LEVEL_CELL: Record<PermissionLevel, string> = {
  view: "bg-info/15 border-info/30 text-info",
  detail: "bg-accent/20 border-accent/35 text-accent",
  sensitive: "bg-gold/20 border-gold/40 text-gold",
  act: "bg-serious border-serious text-accent-ink",
  manage: "bg-ember border-ember text-accent-ink",
};

/** Katak «pop» bilan chiqadigan qadam (s) va eng ko'p kechikish — uzun matritsa kutib qolmasin. */
const POP_STEP = 0.012;
const POP_MAX = 1.2;

/**
 * «Kim nimani ko'radi»: qator — akkaunt, ustun — modul, katakda eng yuqori daraja. Samarali to'plam —
 * shablon + qo'shilgan − olib tashlangan (tafsilot kelguncha shablon bo'yicha). Kataklar ketma-ket chiqadi.
 */
export const AccessMatrix = ({ accounts }: { accounts: readonly Account[] }) => {
  const t = useTranslations("access.matrix");
  const permissions = usePermissionsQuery();
  const shown = accounts.slice(0, MATRIX_LIMIT);

  return (
    <Card>
      <CardHeader
        title={t("title")}
        description={t("description")}
        action={<Legend />}
        className="flex-wrap"
      />
      <CardBody>
        <QueryState
          query={permissions}
          skeleton={<ListSkeleton rows={4} />}
          isEmpty={(catalog) => catalog.length === 0}
        >
          {(catalog) => <MatrixGrid accounts={shown} catalog={catalog} />}
        </QueryState>
        {accounts.length > shown.length ? (
          <p className="text-ink-3 mt-3 text-xs">{t("more", { count: accounts.length - shown.length })}</p>
        ) : null}
      </CardBody>
    </Card>
  );
};

const Legend = () => {
  const tLevel = useTranslations("access.levels");
  return (
    <ul className="text-ink-2 flex flex-wrap gap-x-3.5 gap-y-1 text-xs">
      {PERMISSION_LEVELS.map((level) => (
        <li key={level} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn("size-3 rounded-sm border", LEVEL_CELL[level])} />
          {tLevel(level)}
        </li>
      ))}
    </ul>
  );
};

const MatrixGrid = ({
  accounts,
  catalog,
}: {
  accounts: readonly Account[];
  catalog: readonly PermissionDef[];
}) => {
  const t = useTranslations("access.matrix");
  const tModule = useTranslations("access.modules");
  const tLevel = useTranslations("access.levels");
  const roles = useRolesQuery().data ?? [];
  const details = useAccountDetails(accounts.map((account) => account.id));
  const { openAccount } = useAccessTab();
  const modules = groupByModule(catalog).map((group) => group.module);
  const moduleTitle = (module: string) => (tModule.has(module) ? tModule(module) : module);
  // ustunlar soni katalogdagi modullarga bog'liq
  const style = {
    "--matrix-cols": `minmax(11rem,15rem) repeat(${modules.length},minmax(0,1fr))`,
  } as CSSProperties;

  return (
    <div role="table" aria-label={t("title")}>
      <div
        role="row"
        style={style}
        className="text-ink-3 grid-cols-(--matrix-cols) gap-1.5 pb-2 text-xs max-md:hidden md:grid"
      >
        <span role="columnheader">{t("account")}</span>
        {modules.map((module) => (
          <span key={module} role="columnheader" title={moduleTitle(module)} className="truncate text-center">
            {moduleTitle(module)}
          </span>
        ))}
      </div>
      {accounts.map((account, row) => {
        const detail = details[row]?.data;
        const template = roles.find((role) => role.key === account.role)?.permissions ?? [];
        const levels = moduleLevels(
          effectivePermissions(template, detail?.extra ?? [], detail?.denied ?? []),
          catalog,
        );
        const roleTitle = roles.find((role) => role.key === account.role)?.title;
        return (
          <div
            key={account.id}
            role="row"
            style={style}
            className="grid grid-cols-4 items-center gap-1.5 border-t py-2.5 md:grid-cols-(--matrix-cols)"
          >
            <span role="rowheader" className="col-span-4 min-w-0 md:col-span-1">
              <button
                type="button"
                onClick={() => openAccount(account.id)}
                aria-label={t("openRow", { name: account.fullName })}
                className="flex w-full min-w-0 items-center gap-2.5 rounded-lg text-left hover:underline"
              >
                <span
                  aria-hidden
                  className="bg-surface-3 text-ink text-2xs grid size-8.5 shrink-0 place-items-center rounded-full font-bold"
                >
                  {initialsOf(account.fullName)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{account.fullName}</span>
                  <span className="text-ink-3 block truncate text-xs">{account.title || roleTitle}</span>
                </span>
              </button>
            </span>
            {modules.map((module, column) => {
              const level = levels[module] ?? null;
              const label = `${moduleTitle(module)}: ${level ? tLevel(level) : t("none")}`;
              return (
                <MatrixCell
                  key={module}
                  level={level}
                  label={label}
                  caption={moduleTitle(module)}
                  delay={Math.min(0.3 + (row * modules.length + column) * POP_STEP, POP_MAX)}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const MatrixCell = ({
  level,
  label,
  caption,
  delay,
}: {
  level: PermissionLevel | null;
  label: string;
  caption: string;
  delay: number;
}) => {
  const tShort = useTranslations("access.levelShort");
  const reduce = useReducedMotion();
  return (
    <span role="cell" aria-label={label} className="flex min-w-0 flex-col gap-0.5">
      <motion.span
        aria-hidden
        initial={reduce ? false : { opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 14, delay }}
        className={cn(
          "num grid h-8.5 place-items-center rounded-lg border text-xs font-semibold",
          level ? LEVEL_CELL[level] : "bg-ink/2 border-border",
        )}
      >
        {level ? tShort(level) : ""}
      </motion.span>
      <span aria-hidden className="text-2xs text-ink-3 truncate text-center md:hidden">
        {caption}
      </span>
    </span>
  );
};
