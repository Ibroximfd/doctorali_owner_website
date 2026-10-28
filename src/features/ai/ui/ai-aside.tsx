"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, RotateCcw, Wand2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { useCanAct } from "@/shared/stores/session-store";
import { Button } from "@/shared/ui/button";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Pill, type PillIntent } from "@/shared/ui/pill";
import { BlockSkeleton, ListSkeleton, QueryState } from "@/shared/ui/states";

import { useActionsQuery, useFindingsQuery } from "../hooks/use-ai";
import { useAiTab } from "../hooks/use-ai-tab";
import { canUndo, undoHoursLeft } from "../model/ai.rules";
import type { AiAction, Finding } from "../model/ai.schema";
import { useActionDecision } from "./use-action-decision";

const RISK_INTENT: Record<string, PillIntent> = { low: "good", medium: "warn", high: "crit" };
const SEVERITY_DOT: Record<string, { dot: string; text: string }> = {
  critical: { dot: "bg-crit", text: "text-crit" },
  high: { dot: "bg-serious", text: "text-serious" },
  medium: { dot: "bg-warn", text: "text-warn" },
  low: { dot: "bg-info", text: "text-info" },
};
const AUTO_FIXES_SHOWN = 3;
const FINDINGS_SHOWN = 3;

/** Bloklar ketma-ket xira-aniq bo'lib kiradi (canvas `reveal`). */
const useReveal = (delay: number) => {
  const reduce = useReducedMotion();
  return {
    initial: reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.7, ease: EASE_OUT, delay },
  } as const;
};

/**
 * O'ng ustun — «AI tuzatishlari»: tasdiq kutayotgan taklif (oldin → keyin), bajarilgan avto-tuzatishlar
 * (bekor qilish bilan) va ochiq topilmalar ishonch chiziqlari bilan. Har blok o'z `QueryState`ida.
 */
export const AiAside = ({ className }: { className?: string }) => {
  const t = useTranslations("ai.aside");
  const autoToday = useActionsQuery("proposed").data?.counts.autoToday;
  return (
    <aside aria-labelledby="ai-aside-title" className={cn("flex flex-col gap-3.5", className)}>
      <div className="flex flex-wrap items-baseline gap-x-2.5">
        <h2 id="ai-aside-title" className="font-display text-2xl">
          {t("title")}
        </h2>
        {autoToday ? (
          <span className="text-ink-3 text-xs">{t("autoToday", { count: formatNumber(autoToday) })}</span>
        ) : null}
      </div>
      <PendingApproval />
      <AutoFixes />
      <FindingsConfidence />
    </aside>
  );
};

const PendingApproval = () => {
  const t = useTranslations("ai.aside");
  const query = useActionsQuery("proposed");
  return (
    <QueryState
      query={query}
      skeleton={<BlockSkeleton className="h-56 rounded-3xl" />}
      isEmpty={({ results }) => results.length === 0}
      empty={<p className="panel-surface text-ink-2 rounded-3xl border p-4 text-sm">{t("noPending")}</p>}
    >
      {({ results }) => {
        const [first] = results;
        return first ? <ApprovalCard action={first} more={results.length - 1} /> : null;
      }}
    </QueryState>
  );
};

const ApprovalCard = ({ action, more }: { action: AiAction; more: number }) => {
  const t = useTranslations("ai.aside");
  const tActions = useTranslations("ai.actions");
  const canAct = useCanAct();
  const decide = useActionDecision();
  const { setTab } = useAiTab();
  const reveal = useReveal(0.3);

  return (
    <motion.article
      {...reveal}
      aria-labelledby={`ai-approval-${action.id}`}
      className="border-gold/30 from-gold/10 to-gold/2 rounded-3xl border bg-linear-to-b p-4.5"
    >
      <div className="flex flex-wrap gap-2">
        <Pill intent="warn">{t("needsApproval")}</Pill>
        {action.risk in RISK_INTENT ? (
          <Pill intent={RISK_INTENT[action.risk]}>{tActions(`risk.${action.risk}`)}</Pill>
        ) : null}
      </div>
      <h3 id={`ai-approval-${action.id}`} className="text-md mt-2.5 leading-snug font-bold">
        {action.title}
      </h3>
      <p className="text-ink-2 mt-1.5 text-sm">{action.reason}</p>

      {action.preview.length > 0 ? (
        <ul
          aria-label={tActions("preview")}
          className="bg-bg/50 mt-3 flex flex-col gap-2 rounded-xl px-3 py-2.5 text-xs"
        >
          {action.preview.map((row, index) => (
            <li key={`${row.label}-${index}`} className="flex min-w-0 items-center gap-2">
              <span className="num w-20 shrink-0 truncate">{row.label}</span>
              <span className="text-crit min-w-0 flex-1 truncate line-through">{row.before}</span>
              <ArrowRight aria-hidden className="text-ink-3 size-3.5 shrink-0" />
              <span className="text-good min-w-0 flex-1 truncate font-bold">{row.after}</span>
            </li>
          ))}
          {action.previewMore > 0 ? (
            <li className="text-ink-3">{tActions("more", { count: action.previewMore })}</li>
          ) : null}
        </ul>
      ) : null}

      {canAct ? (
        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            disabled={decide.isPending}
            onClick={() => decide.run(action.id, "approve")}
            className="bg-gold text-forest inline-flex min-h-10.5 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold transition hover:brightness-110 disabled:opacity-50"
          >
            <Check aria-hidden className="size-4" />
            {tActions("approve")}
          </button>
          <button
            type="button"
            disabled={decide.isPending}
            onClick={() => decide.run(action.id, "reject")}
            className="border-gold/35 text-warn hover:bg-gold/10 inline-flex min-h-10.5 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <X aria-hidden className="size-4" />
            {tActions("reject")}
          </button>
        </div>
      ) : null}
      {more > 0 ? (
        <Button intent="ghost" size="sm" className="mt-2" onClick={() => setTab("actions")}>
          {t("morePending", { count: formatNumber(more) })}
          <ArrowRight aria-hidden />
        </Button>
      ) : null}
    </motion.article>
  );
};

/** Bajarilgan tuzatishlar (eng yangisi tepada); muddati o'tmaganini bir bosishda bekor qilish mumkin. */
const AutoFixes = () => {
  const query = useActionsQuery("all");
  return (
    <QueryState
      query={query}
      skeleton={<ListSkeleton rows={3} />}
      isEmpty={({ results }) => !results.some((action) => action.status === "done")}
      empty={<></>}
    >
      {({ results }) => (
        <ul className="flex flex-col gap-2.5">
          {results
            .filter((action) => action.status === "done")
            .slice(0, AUTO_FIXES_SHOWN)
            .map((action, index) => (
              <AutoFixRow key={action.id} action={action} index={index} />
            ))}
        </ul>
      )}
    </QueryState>
  );
};

const AutoFixRow = ({ action, index }: { action: AiAction; index: number }) => {
  const t = useTranslations("ai.aside");
  const tActions = useTranslations("ai.actions");
  const canAct = useCanAct();
  const decide = useActionDecision();
  const reveal = useReveal(0.45 + index * 0.1);
  // «hozir» — qator chizilgan payt: bekor qilish muddati sahifa ochiq turganda ham to'g'ri
  const [now] = useState(() => Date.now());
  const undoable = canUndo(action, now) && action.undoUntil !== null;

  return (
    <motion.li {...reveal} className="panel-surface rounded-2xl border px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="bg-accent/12 text-accent grid size-7.5 shrink-0 place-items-center rounded-lg">
          <Wand2 aria-hidden className="size-4" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold">{action.title}</span>
        {canAct && undoable ? (
          <button
            type="button"
            disabled={decide.isPending}
            onClick={() => decide.run(action.id, "undo")}
            className="text-ink-2 hover:text-ink hover:border-border-strong inline-flex h-7.5 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RotateCcw aria-hidden className="size-3" />
            {t("undo")}
          </button>
        ) : null}
      </div>
      <p className="text-ink-3 mt-1.5 ml-10 text-xs">
        {action.mode === "auto" ? `${tActions("mode.auto")} · ` : null}
        {action.reason}
        {undoable && action.undoUntil
          ? ` · ${t("undoLeft", { hours: undoHoursLeft(action.undoUntil, now) })}`
          : null}
      </p>
    </motion.li>
  );
};

/** Ochiq topilmalar: jiddiylik nuqtasi, xavf ostidagi pul va AI ishonchi chizig'i. */
const FindingsConfidence = () => {
  const t = useTranslations("ai.aside");
  const { setTab } = useAiTab();
  const query = useFindingsQuery("open");
  return (
    <section aria-labelledby="ai-aside-findings" className="panel-surface mt-1.5 rounded-3xl border p-4.5">
      <div className="flex items-center justify-between gap-3">
        <h3 id="ai-aside-findings" className="text-md font-bold">
          {t("findingsTitle")}
        </h3>
        <button
          type="button"
          onClick={() => setTab("findings")}
          className="text-ink-3 hover:text-ink text-xs transition-colors"
        >
          {t("allFindings")}
        </button>
      </div>
      <QueryState
        query={query}
        skeleton={<ListSkeleton rows={3} className="mt-3" />}
        isEmpty={({ results }) => results.length === 0}
        empty={<p className="text-ink-3 mt-3 text-sm">{t("noFindings")}</p>}
      >
        {({ results }) => (
          <ul className="flex flex-col">
            {results.slice(0, FINDINGS_SHOWN).map((finding, index) => (
              <ConfidenceRow key={finding.id} finding={finding} index={index} />
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  );
};

const ConfidenceRow = ({ finding, index }: { finding: Finding; index: number }) => {
  const t = useTranslations("ai.aside");
  const format = useFormat();
  const reduce = useReducedMotion();
  const tone = SEVERITY_DOT[finding.severity] ?? { dot: "bg-ink-3", text: "text-ink-2" };
  const confidence = Math.max(0, Math.min(100, finding.confidence));

  return (
    <li className="mt-3.5">
      <div className="flex items-baseline gap-2.5">
        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", tone.dot)} />
        <span className="min-w-0 flex-1 text-sm font-semibold">{finding.title}</span>
        <span className={cn("num shrink-0 text-sm font-semibold", tone.text)}>
          {finding.amountAtRisk === null ? "—" : format.moneyCompact(finding.amountAtRisk)}
        </span>
      </div>
      <div className="mt-2 ml-4.5 flex items-center gap-2.5">
        <span
          role="meter"
          aria-label={t("confidence", { value: confidence })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={confidence}
          className="bg-ink/6 h-1 flex-1 overflow-hidden rounded-full"
        >
          <motion.span
            className={cn("block h-full origin-left rounded-full", tone.dot)}
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: confidence / 100 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 + index * 0.1 }}
          />
        </span>
        <span aria-hidden className="num text-ink-3 text-2xs">
          {confidence}%
        </span>
      </div>
    </li>
  );
};
