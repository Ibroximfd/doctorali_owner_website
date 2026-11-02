"use client";

import { KeyRound, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { toAppError } from "@/shared/lib/app-error";
import { cn } from "@/shared/lib/cn";
import { useMetaQuery } from "@/shared/meta/use-meta-query";
import { useCanAct } from "@/shared/stores/session-store";
import { Button } from "@/shared/ui/button";
import { Pill } from "@/shared/ui/pill";
import { Segmented } from "@/shared/ui/segmented";
import { BlockSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useAnalysisQuery, useRefreshAnalysis } from "../hooks/use-ai";
import { useAiPeriod } from "../hooks/use-ai-tab";
import {
  analysisSummary,
  findingAdvice,
  findingDetail,
  findingTitle,
  groupBySeverity,
  ownerRoleOf,
  refreshFailure,
  summaryLines,
  summaryState,
} from "../model/ai.rules";
import { AI_PERIODS, type Analysis, type Finding } from "../model/ai.schema";

const SEVERITY_STYLE: Record<string, { dot: string; text: string }> = {
  urgent: { dot: "bg-crit", text: "text-crit" },
  attention: { dot: "bg-warn", text: "text-warn" },
  good: { dot: "bg-good", text: "text-good" },
  other: { dot: "bg-ink-3", text: "text-ink-2" },
};

/**
 * «Tahlil» (TZ 32 §I-2): kirishda SAQLANGAN natija (`GET`, AI chaqirilmaydi), «Yangilash» —
 * `POST` (AI bir marta). Kalitsiz rejimda AI xulosasi o'rnida izoh, hisoblangan topilmalar
 * baribir ko'rinadi. Hisob ketayotgan bo'lsa — tugma bloklanadi va natija kutiladi.
 */
export const FindingsPanel = () => {
  const t = useTranslations("ai.findings");
  const canAct = useCanAct();
  const { period, setPeriod } = useAiPeriod();
  const query = useAnalysisQuery(period);
  const refresh = useRefreshAnalysis(period);
  const isRunning = query.data?.status === "running";
  const isBusy = refresh.isPending || isRunning;
  const failure = refresh.error ? refreshFailure(toAppError(refresh.error)) : null;

  return (
    <section aria-labelledby="ai-findings-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <h2 id="ai-findings-title" className="font-strong text-lg">
            {t("title")}
          </h2>
          <p className="text-ink-3 text-xs">{t("description")}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <Segmented
            className="max-w-full flex-wrap"
            ariaLabel={t("periodLabel")}
            value={period}
            disabled={refresh.isPending}
            onChange={(next) => {
              refresh.reset();
              setPeriod(next);
            }}
            options={AI_PERIODS.map((value) => ({ value, label: t(`periods.${value}`) }))}
          />
          {canAct ? (
            <Button size="sm" disabled={isBusy} aria-busy={isBusy} onClick={() => refresh.mutate()}>
              <RefreshCw aria-hidden className={cn(isBusy && "animate-spin")} />
              {t(refresh.isPending ? "refreshing" : isRunning ? "running" : "refresh")}
            </Button>
          ) : null}
        </div>
      </div>
      <p role="status" aria-live="polite" className="empty:hidden">
        {isRunning || failure === "running" ? (
          <span className="text-ink-2 text-sm">{t("runningNote")}</span>
        ) : failure ? (
          <span className={cn("text-sm", failure === "noKey" ? "text-warn" : "text-crit")}>
            {t(`refreshErrors.${failure}`)}
          </span>
        ) : null}
      </p>
      <QueryState
        query={query}
        skeleton={
          <div className="flex flex-col gap-3">
            <BlockSkeleton className="h-32" />
            <BlockSkeleton className="h-48" />
          </div>
        }
      >
        {(analysis) => <AnalysisBody analysis={analysis} />}
      </QueryState>
    </section>
  );
};

const AnalysisBody = ({ analysis }: { analysis: Analysis }) => {
  const t = useTranslations("ai.findings");
  const locale = useLocale();
  const format = useFormat();
  const state = summaryState(analysis, locale);
  const lines = summaryLines(analysisSummary(analysis, locale));
  return (
    <>
      <div className="panel-surface rounded-3xl border p-4 md:p-5">
        <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {state === "noKey" ? (
            <KeyRound aria-hidden className="text-warn size-4" />
          ) : (
            <Sparkles aria-hidden className="text-accent size-4" />
          )}
          {t("summary")}
          {analysis.period ? (
            <span className="text-ink-3 text-xs font-normal">
              {t("periodRange", {
                from: format.date(analysis.period.dateFrom),
                to: format.date(analysis.period.dateTo),
              })}
            </span>
          ) : null}
        </h3>
        {state === "summary" ? (
          <ol className="text-ink mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        ) : (
          <p className="text-ink-2 mt-2 text-sm">{t(`summaryStates.${state}`)}</p>
        )}
        {analysis.status === "ready" && analysis.generatedAt ? (
          <p className="text-2xs text-ink-3 mt-2">
            {t("savedAt", { time: format.dateTime(analysis.generatedAt) })}
          </p>
        ) : null}
      </div>
      {analysis.findings.length === 0 && analysis.warehouseFindings.length === 0 ? (
        <StateBlock icon={ShieldCheck} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <>
          <FindingGroups findings={analysis.findings} />
          {analysis.warehouseFindings.length > 0 ? (
            <section aria-labelledby="ai-sklad-findings">
              <h3 id="ai-sklad-findings" className="mb-2 text-sm font-semibold">
                {t("warehouse")}
              </h3>
              <FindingGroups findings={analysis.warehouseFindings} />
            </section>
          ) : null}
        </>
      )}
    </>
  );
};

const FindingGroups = ({ findings }: { findings: readonly Finding[] }) => {
  const t = useTranslations("ai.severity");
  return (
    <div className="flex flex-col gap-3">
      {groupBySeverity(findings).map((group) => {
        const style = SEVERITY_STYLE[group.severity] ?? SEVERITY_STYLE.other;
        return (
          <section key={group.severity} aria-label={t(group.severity)}>
            <h4 className={cn("mb-1.5 flex items-center gap-2 text-xs font-semibold", style?.text)}>
              <span aria-hidden className={cn("size-2 rounded-full", style?.dot)} />
              {t(group.severity)} · {group.items.length}
            </h4>
            <ul className="flex flex-col gap-2">
              {group.items.map((finding, index) => (
                <FindingItem key={`${findingTitle(finding)}-${index}`} finding={finding} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

/** Topilma: sarlavha, kimga tegishli (filial · B.L/B.O), izoh va maslahat. */
const FindingItem = ({ finding }: { finding: Finding }) => {
  const t = useTranslations("ai.findings");
  const tRole = useTranslations("ai.roles");
  const locale = useLocale();
  const filials = useMetaQuery().data?.filials;
  const detail = findingDetail(finding, locale);
  const advice = findingAdvice(finding);
  const role = ownerRoleOf(finding.owner_role);
  const filial =
    typeof finding.filial_id === "number"
      ? filials?.find((item) => item.id === finding.filial_id)
      : undefined;
  return (
    <li className="bg-surface rounded-2xl border px-4 py-3">
      <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
        <span className="min-w-0 flex-1 text-sm font-semibold">{findingTitle(finding, locale)}</span>
        {role || filial ? (
          <span className="flex flex-wrap gap-1">
            {filial ? <Pill intent="neutral">{filial.name}</Pill> : null}
            {role ? <Pill intent="info">{tRole(role)}</Pill> : null}
          </span>
        ) : null}
      </div>
      {detail ? <p className="text-ink-2 mt-1 text-sm">{detail}</p> : null}
      {advice ? (
        <p className="text-ink-2 mt-1.5 text-xs">
          <span className="text-ink font-semibold">{t("advice")}</span> {advice}
        </p>
      ) : null}
    </li>
  );
};
