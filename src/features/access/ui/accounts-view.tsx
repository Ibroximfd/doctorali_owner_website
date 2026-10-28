"use client";

import { motion, useReducedMotion } from "motion/react";
import { KeyRound, Lightbulb, Lock, Search, ShieldAlert, UserPlus, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDeferredValue, useState } from "react";

import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { cn } from "@/shared/lib/cn";
import { formatPhone, initialsOf } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Grid, span } from "@/shared/ui/grid";
import { Chip } from "@/shared/ui/chip";
import { Input } from "@/shared/ui/input";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Pill, type PillIntent } from "@/shared/ui/pill";
import { ListSkeleton, NoResults, QueryState, StateBlock } from "@/shared/ui/states";

import { useAccessTab, useAccountsQuery, useDepartmentsQuery, useRolesQuery } from "../hooks/use-iam";
import { isAccountStatus, type AccountStatus } from "../model/iam.rules";
import type { Account } from "../model/iam.schema";
import { AccessMatrix } from "./access-matrix";
import { AiWatchCard } from "./ai-watch-card";
import { RoleTiles } from "./role-tiles";

const STATUS_INTENT: Record<AccountStatus, PillIntent> = {
  active: "good",
  invited: "info",
  blocked: "crit",
  offboarded: "neutral",
};

/**
 * Platforma akkauntlari: shablon plitkalari, bo'lim/qidiruv filtri, «Kim nimani ko'radi» matritsasi,
 * AI kuzatuvi va akkaunt kartalari (bosilsa — akkaunt drawer'i).
 */
export const AccountsView = () => {
  const t = useTranslations("access.accounts");
  const { openNewAccount } = useAccessTab();
  const departments = useDepartmentsQuery().data ?? [];
  const [department, setDepartment] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search.trim());
  const query = useAccountsQuery(department, deferred);
  const departmentTitle = (key: string) => departments.find((item) => item.key === key)?.title ?? key;

  return (
    <>
      <RoleTiles department={department} onDepartment={setDepartment} />
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
        <div
          role="group"
          aria-label={t("departments")}
          className="fade-mask-x flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1"
        >
          <Chip pressed={department === null} onClick={() => setDepartment(null)}>
            {t("allDepartments")}
          </Chip>
          {departments.map((item) => (
            <Chip
              key={item.key}
              pressed={department === item.key}
              count={item.accountsCount}
              onClick={() => setDepartment(department === item.key ? null : item.key)}
            >
              {item.title}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-64">
            <Search aria-hidden className="text-ink-3 absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              aria-label={t("search")}
              placeholder={t("search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Button intent="primary" onClick={openNewAccount}>
            <UserPlus aria-hidden />
            {t("create")}
          </Button>
        </div>
      </div>
      <QueryState
        query={query}
        skeleton={<ListSkeleton rows={5} />}
        isEmpty={(rows) => rows.length === 0 && department === null && deferred === ""}
        empty={
          <Card>
            <StateBlock
              icon={UsersRound}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <Button intent="primary" onClick={openNewAccount}>
                  <UserPlus aria-hidden />
                  {t("create")}
                </Button>
              }
            />
          </Card>
        }
      >
        {(rows) =>
          rows.length === 0 ? (
            <Card>
              <NoResults
                query={deferred || undefined}
                onClear={() => {
                  setDepartment(null);
                  setSearch("");
                }}
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-3 md:gap-4">
              <AccessMatrix accounts={rows} />
              <Grid>
                <AiWatchCard accounts={rows} className={span.c4} />
                <Card className={span.c8}>
                  <CardHeader title={t("title")} description={t("description")} />
                  <CardBody>
                    <ul className="grid gap-2.5 lg:grid-cols-2">
                      {rows.map((account, index) => (
                        <AccountCard
                          key={account.id}
                          account={account}
                          index={index}
                          departmentTitle={departmentTitle(account.department)}
                        />
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              </Grid>
            </div>
          )
        }
      </QueryState>
    </>
  );
};

const AccountCard = ({
  account,
  index,
  departmentTitle,
}: {
  account: Account;
  index: number;
  departmentTitle: string;
}) => {
  const t = useTranslations("access.accounts");
  const relative = useRelativeTime();
  const reduce = useReducedMotion();
  const roles = useRolesQuery().data ?? [];
  const { openAccount } = useAccessTab();
  const roleTitle = roles.find((role) => role.key === account.role)?.title ?? account.role;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: account.status === "offboarded" ? 0.55 : 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT, delay: Math.min(index, 8) * 0.04 }}
    >
      <button
        type="button"
        onClick={() => openAccount(account.id)}
        aria-label={t("open", { name: account.fullName })}
        className={cn(
          "bg-surface-2/60 hover:border-border-strong hover:bg-surface-2 flex h-full w-full gap-3 rounded-2xl border p-3.5 text-left transition-colors",
          account.status === "blocked" && "border-crit/50",
        )}
      >
        <span className="hero-surface text-hero-ink font-strong relative grid size-10 shrink-0 place-items-center rounded-full text-sm">
          {initialsOf(account.fullName)}
          {account.status === "blocked" ? (
            <Lock
              aria-hidden
              className="bg-crit text-surface absolute -right-1 -bottom-1 size-4 rounded-full p-0.5"
            />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold">{account.fullName}</span>
            <Pill intent={isAccountStatus(account.status) ? STATUS_INTENT[account.status] : "neutral"}>
              {isAccountStatus(account.status) ? t(`status.${account.status}`) : account.status}
            </Pill>
          </span>
          <span className="text-2xs text-ink-3 block">
            {account.title || roleTitle} · {departmentTitle}
            {account.phone ? ` · ${formatPhone(account.phone)}` : ""}
          </span>
          <span className="text-2xs text-ink-2 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <KeyRound aria-hidden className="size-3" />
              {t("permissions", { count: account.permissionsCount })}
            </span>
            {account.sensitiveCount > 0 ? (
              <span className="text-serious inline-flex items-center gap-1">
                <ShieldAlert aria-hidden className="size-3" />
                {t("sensitive", { count: account.sensitiveCount })}
              </span>
            ) : null}
            <span>
              {account.lastLoginAt
                ? t("lastLogin", { when: relative(account.lastLoginAt) })
                : t("neverLoggedIn")}
            </span>
          </span>
          {account.unusedPermissions.length > 0 ? (
            <span className="bg-gold-soft text-2xs mt-1.5 flex items-center gap-1 rounded-md px-2 py-1">
              <Lightbulb aria-hidden className="text-gold size-3" />
              {t("unused", { count: account.unusedPermissions.length })}
            </span>
          ) : null}
        </span>
      </button>
    </motion.li>
  );
};
