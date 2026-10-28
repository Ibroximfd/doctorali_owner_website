"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, OctagonPause, RotateCcw, ShieldCheck, Wand2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { useCanAct } from "@/shared/stores/session-store";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Pill, type PillIntent } from "@/shared/ui/pill";
import { Segmented } from "@/shared/ui/segmented";
import { BlockSkeleton, ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";
import { Switch } from "@/shared/ui/switch";

import { useActionsQuery, useAutopilotQuery, useSaveAutopilot } from "../hooks/use-ai";
import { ACTION_MODES, canUndo, isActionMode, undoHoursLeft } from "../model/ai.rules";
import type { AiAction, Autopilot } from "../model/ai.schema";
import { useActionDecision, type ActionDecision } from "./use-action-decision";

const RISK_INTENT: Record<string, PillIntent> = { low: "good", medium: "warn", high: "crit" };
const STATUS_INTENT: Record<string, PillIntent> = {
  proposed: "info",
  running: "warn",
  done: "good",
  failed: "crit",
  rejected: "neutral",
  stale: "neutral",
  undone: "neutral",
};

/**
 * AI avto-tuzatish: AI xato topadi va tuzatishni taklif qiladi; boshliq bir bosishda tasdiqlaydi,
 * xavfsizlari avtomatik bajariladi va 24 soat ichida bekor qilinadi. Tepada — «hammasini to'xtatish».
 */
export const ActionsPanel = () => {
  const t = useTranslations("ai.actions");
  const [status, setStatus] = useState<"proposed" | "all">("proposed");
  const query = useActionsQuery(status);

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <section aria-labelledby="ai-actions-title" className="lg:col-span-8">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div>
            <h2 id="ai-actions-title" className="font-strong text-lg">
              {t("title")}
            </h2>
            <p className="text-ink-3 text-xs">{t("description")}</p>
          </div>
          <Segmented
            className="ml-auto"
            ariaLabel={t("filter")}
            value={status}
            onChange={setStatus}
            options={[
              { value: "proposed", label: t("waiting") },
              { value: "all", label: t("history") },
            ]}
          />
        </div>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={4} />}
          isEmpty={({ results }) => results.length === 0}
          empty={
            <StateBlock icon={ShieldCheck} title={t("emptyTitle")} description={t("emptyDescription")} />
          }
        >
          {({ results }) => (
            <ul className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {results.map((action, index) => (
                  <ActionCard key={action.id} action={action} index={index} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </QueryState>
      </section>
      <AutopilotCard className="lg:col-span-4" />
    </div>
  );
};

const ActionCard = ({ action, index }: { action: AiAction; index: number }) => {
  const t = useTranslations("ai.actions");
  const relative = useRelativeTime();
  const reduce = useReducedMotion();
  const canAct = useCanAct();
  const decide = useActionDecision();
  // «hozir» — taklif tuzilgan vaqtdan emas, kartani chizgan paytdan: undo muddati sahifa ochiq turganda ham to'g'ri
  const [now] = useState(() => Date.now());
  const undoable = canUndo(action, now);
  const run = (decision: ActionDecision) => decide.run(action.id, decision);

  return (
    <motion.li
      layout={reduce ? false : "position"}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, x: 24 }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay: Math.min(index, 6) * 0.05 }}
      className="panel-surface rounded-3xl border p-4.5"
    >
      <div className="flex items-start gap-3">
        <span className="bg-accent-soft text-accent grid size-10 shrink-0 place-items-center rounded-xl">
          <Wand2 aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill intent={RISK_INTENT[action.risk] ?? "neutral"}>
              {action.risk in RISK_INTENT ? t(`risk.${action.risk}`) : action.risk}
            </Pill>
            <Pill intent={STATUS_INTENT[action.status] ?? "neutral"}>
              {action.status in STATUS_INTENT ? t(`status.${action.status}`) : action.status}
            </Pill>
            {isActionMode(action.mode) ? <Pill>{t(`mode.${action.mode}`)}</Pill> : null}
            <span className="text-2xs text-ink-3 ml-auto">{relative(action.proposedAt)}</span>
          </div>
          <h3 className="text-md mt-1.5 leading-snug font-semibold">{action.title}</h3>
          <p className="text-ink-2 mt-1 text-sm">{action.reason}</p>
        </div>
      </div>

      {action.preview.length > 0 ? (
        <div className="bg-surface-2 mt-3 overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <caption className="sr-only">{t("preview")}</caption>
            <tbody>
              {action.preview.map((row, rowIndex) => (
                <tr key={`${row.label}-${rowIndex}`} className={cn(rowIndex > 0 && "border-t")}>
                  <th scope="row" className="num px-3 py-1.5 text-left font-semibold whitespace-nowrap">
                    {row.label}
                  </th>
                  <td className="text-crit px-3 py-1.5 line-through decoration-1">{row.before}</td>
                  <td aria-hidden className="text-ink-3 px-1">
                    <ArrowRight className="size-3.5" />
                  </td>
                  <td className="text-good px-3 py-1.5 font-medium">{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {action.previewMore > 0 ? (
            <p className="text-2xs text-ink-3 border-t px-3 py-1.5">
              {t("more", { count: action.previewMore })}
            </p>
          ) : null}
        </div>
      ) : null}

      {canAct ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {action.status === "proposed" ? (
            <>
              <Button intent="primary" size="sm" disabled={decide.isPending} onClick={() => run("approve")}>
                <Check aria-hidden />
                {t("approve")}
              </Button>
              <Button intent="ghost" size="sm" disabled={decide.isPending} onClick={() => run("reject")}>
                <X aria-hidden />
                {t("reject")}
              </Button>
            </>
          ) : null}
          {undoable && action.undoUntil ? (
            <Button size="sm" disabled={decide.isPending} onClick={() => run("undo")}>
              <RotateCcw aria-hidden />
              {t("undo", { hours: undoHoursLeft(action.undoUntil, now) })}
            </Button>
          ) : null}
          {action.decidedBy ? (
            <span className="text-2xs text-ink-3 ml-auto">{t("decidedBy", { name: action.decidedBy })}</span>
          ) : null}
        </div>
      ) : null}
    </motion.li>
  );
};

/** Avtopilot: har playbook rejimi (avto / tasdiq / tavsiya) va bitta tugma bilan hammasini to'xtatish. */
const AutopilotCard = ({ className }: { className?: string }) => {
  const t = useTranslations("ai.actions");
  const query = useAutopilotQuery();
  return (
    <Card className={className}>
      <CardHeader title={t("autopilot")} description={t("autopilotDescription")} />
      <CardBody>
        <QueryState query={query} skeleton={<BlockSkeleton className="h-64" />}>
          {(autopilot) => <AutopilotForm autopilot={autopilot} />}
        </QueryState>
      </CardBody>
    </Card>
  );
};

const AutopilotForm = ({ autopilot }: { autopilot: Autopilot }) => {
  const t = useTranslations("ai.actions");
  const canAct = useCanAct();
  const save = useSaveAutopilot();

  const submit = (patch: Partial<{ enabled: boolean; mode: { key: string; value: string } }>) =>
    save.mutate(
      {
        enabled: patch.enabled ?? autopilot.enabled,
        playbooks: autopilot.playbooks.map((playbook) => ({
          key: playbook.key,
          mode: patch.mode && patch.mode.key === playbook.key ? patch.mode.value : playbook.mode,
        })),
      },
      { onError: () => toast.error(t("failed")) },
    );

  return (
    <div className="flex flex-col gap-4">
      <label
        className={cn(
          "flex items-center gap-3 rounded-xl border p-3",
          autopilot.enabled ? "bg-good-soft border-good/40" : "bg-crit-soft border-crit/40",
        )}
      >
        <OctagonPause aria-hidden className={cn("size-5", autopilot.enabled ? "text-good" : "text-crit")} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {autopilot.enabled ? t("enabled") : t("paused")}
          </span>
          <span className="text-2xs text-ink-3 block">{t("killSwitchHint")}</span>
        </span>
        <Switch
          checked={autopilot.enabled}
          disabled={!canAct || save.isPending}
          onCheckedChange={(enabled) => submit({ enabled })}
          aria-label={t("killSwitch")}
        />
      </label>
      <ul className="flex flex-col gap-2.5">
        {autopilot.playbooks.map((playbook) => (
          <li key={playbook.key} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{playbook.title}</span>
              <Pill intent={RISK_INTENT[playbook.risk] ?? "neutral"}>
                {playbook.risk in RISK_INTENT ? t(`risk.${playbook.risk}`) : playbook.risk}
              </Pill>
            </div>
            <div className="flex items-center gap-2">
              <Segmented
                ariaLabel={t("modeFor", { name: playbook.title })}
                value={isActionMode(playbook.mode) ? playbook.mode : null}
                onChange={(value) => (canAct ? submit({ mode: { key: playbook.key, value } }) : undefined)}
                options={ACTION_MODES.filter((mode) => playbook.allowedModes.includes(mode)).map((mode) => ({
                  value: mode,
                  label: t(`mode.${mode}`),
                }))}
              />
              <span className="text-2xs text-ink-3 ml-auto">
                {t("runsToday", { count: formatNumber(playbook.runsToday) })}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
