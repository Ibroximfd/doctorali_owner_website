"use client";

import { motion, useReducedMotion } from "motion/react";
import { Pencil, Star, UserRoundPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { filialCode } from "@/shared/meta/meta.schema";
import { useRegionName } from "@/shared/meta/use-region-name";
import { useCanAct } from "@/shared/stores/session-store";
import { Button } from "@/shared/ui/button";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Pill } from "@/shared/ui/pill";
import { Sparkline } from "@/shared/ui/sparkline";

import { useFilialDialogs } from "../hooks/use-filials";
import { leaderOf } from "../model/filials.rules";
import {
  LEADER_ROLES,
  type FilialItem,
  type FilialPerformance,
  type LeaderRole,
} from "../model/filials.schema";

type FilialCardProps = {
  filial: FilialItem;
  /** `undefined` — yuklanmoqda; `null` — bu davrda ma'lumot yo'q; `"pending"` — backend kutilmoqda. */
  performance: FilialPerformance | null | undefined | "pending";
  onMakeMain: (filial: FilialItem) => void;
  index: number;
};

/**
 * Bitta filial: belgi va nom, asosiy/nofaol belgisi, ikki rahbar (B.L, B.O), tarkib soni va davr
 * natijasi. Rahbar qatori bosilsa — detal oynasi; bo'sh o'rinda — «Tayinlash».
 */
export const FilialCard = ({ filial, performance, onMakeMain, index }: FilialCardProps) => {
  const t = useTranslations("filials");
  const regionName = useRegionName();
  const reduce = useReducedMotion();
  const canAct = useCanAct();
  const { openEdit } = useFilialDialogs();

  return (
    <motion.article
      aria-labelledby={`filial-${filial.id}-title`}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT, delay: Math.min(index, 5) * 0.06 }}
      className="panel-surface flex min-w-0 flex-col rounded-3xl border"
    >
      <header className="flex items-start gap-3 px-4 pt-4 md:px-5 md:pt-5">
        <span
          aria-hidden
          className="bg-accent-soft text-accent font-display grid size-12 shrink-0 place-items-center rounded-2xl text-lg"
        >
          {filialCode(filial)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`filial-${filial.id}-title`} className="font-display truncate text-2xl leading-tight">
            {filial.name}
          </h2>
          <p className="text-ink-3 mt-0.5 text-xs">
            {filial.region ? `${regionName(filial.region)} · ` : ""}
            {t("card.counts", {
              departments: filial.departmentsCount,
              operators: filial.operatorsCount,
              logists: filial.logistsCount,
            })}
          </p>
          {/* belgi berilmagan — yuqoridagi harflar nomdan olingan zaxira (B-16) */}
          {filial.code?.trim() ? null : canAct ? (
            <button
              type="button"
              onClick={() => openEdit(filial.id)}
              className="text-ink-3 hover:text-accent mt-1 text-xs underline-offset-2 hover:underline"
            >
              {t("card.noCode")}
            </button>
          ) : (
            <p className="text-ink-3 mt-1 text-xs">{t("card.noCodeView")}</p>
          )}
        </div>
        {filial.isMain ? (
          <Pill intent="warn" icon={Star}>
            {t("card.main")}
          </Pill>
        ) : filial.isActive ? null : (
          <Pill intent="neutral">{t("card.inactive")}</Pill>
        )}
      </header>

      <PerformanceLine performance={performance} />

      <ul className="mx-4 flex flex-col divide-y border-t md:mx-5">
        {LEADER_ROLES.map((role) => (
          <LeaderRow key={role} filial={filial} role={role} />
        ))}
      </ul>

      {canAct ? (
        <footer className="mt-auto flex flex-wrap gap-2 border-t px-4 py-3.5 md:px-5">
          <Button size="sm" onClick={() => openEdit(filial.id)}>
            <Pencil aria-hidden />
            {t("card.edit")}
          </Button>
          {filial.isMain ? null : (
            <Button size="sm" intent="ghost" onClick={() => onMakeMain(filial)}>
              <Star aria-hidden />
              {t("card.makeMain")}
            </Button>
          )}
        </footer>
      ) : null}
    </motion.article>
  );
};

const PerformanceLine = ({ performance }: { performance: FilialCardProps["performance"] }) => {
  const t = useTranslations("filials.card");
  const format = useFormat();

  if (performance === undefined)
    return (
      <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4 md:px-5">
        {Array.from({ length: 4 }, (_, item) => (
          <span key={item} className="skeleton h-10" />
        ))}
      </div>
    );
  if (performance === "pending")
    return <p className="text-ink-3 px-4 py-4 text-sm md:px-5">{t("perfPending")}</p>;
  if (performance === null) return <p className="text-ink-3 px-4 py-4 text-sm md:px-5">{t("noData")}</p>;

  const stats = [
    { key: "sold", label: t("sold"), value: formatNumber(performance.sold) },
    { key: "conversion", label: t("conversion"), value: formatPercent(performance.conversionPct) },
    { key: "cancel", label: t("cancelRate"), value: formatPercent(performance.cancelRatePct) },
    { key: "revenue", label: t("revenue"), value: format.moneyCompact(performance.revenue) },
  ];

  return (
    <div className="flex items-end gap-3 px-4 py-4 md:px-5">
      <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.key} className="min-w-0">
            <dt className="text-2xs text-ink-3 truncate">{stat.label}</dt>
            <dd className="num text-lg leading-tight font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>
      {performance.trend.length > 1 ? (
        <Sparkline values={performance.trend} className="w-20 shrink-0 max-sm:hidden" />
      ) : null}
    </div>
  );
};

const LeaderRow = ({ filial, role }: { filial: FilialItem; role: LeaderRole }) => {
  const t = useTranslations("filials");
  const canAct = useCanAct();
  const { openLeader, openSeat } = useFilialDialogs();
  const leader = leaderOf(filial, role);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
      <span className="text-2xs text-ink-2 bg-surface-3 rounded-sm px-1.5 py-0.5 font-bold">
        {t(`roles.short.${role}`)}
      </span>
      <div className="min-w-0 flex-1">
        {leader ? (
          // qator bosilsa — rahbar detal oynasi (dopusklar, almashtirish, olib tashlash, tarix)
          <button
            type="button"
            onClick={() => openSeat(filial.id, role)}
            aria-label={t("card.openSeatLabel", { name: leader.fullName, role: t(`roles.long.${role}`) })}
            className="hover:bg-surface-2 -mx-2 block w-full rounded-xl px-2 py-1 text-left transition-colors"
          >
            <span className="block truncate text-sm font-semibold">{leader.fullName}</span>
            <span className="text-ink-3 num block text-xs">
              {leader.username} · {t("card.permissions", { count: leader.permissions.length })}
            </span>
          </button>
        ) : (
          <div className="text-warn text-sm font-medium">
            {t("card.noLeader", { role: t(`roles.long.${role}`) })}
          </div>
        )}
      </div>
      {canAct && !leader ? (
        <Button
          size="sm"
          intent="primary"
          aria-label={t("card.assignLeaderLabel", { role: t(`roles.long.${role}`), filial: filial.name })}
          onClick={() => openLeader(filial.id, role)}
        >
          <UserRoundPlus aria-hidden />
          {t("card.assignLeader")}
        </Button>
      ) : null}
    </li>
  );
};
