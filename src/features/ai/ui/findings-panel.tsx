"use client";

import { RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { BlockSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useAnalysisQuery, useRefreshAnalysis } from "../hooks/use-ai";
import { findingAdvice, findingDetail, findingTitle, groupBySeverity, summaryLines } from "../model/ai.rules";
import type { Analysis, Finding } from "../model/ai.schema";

const SEVERITY_STYLE: Record<string, { dot: string; text: string }> = {
  urgent: { dot: "bg-crit", text: "text-crit" },
  attention: { dot: "bg-warn", text: "text-warn" },
  good: { dot: "bg-good", text: "text-good" },
  other: { dot: "bg-ink-3", text: "text-ink-2" },
};

/**
 * «Tahlil» (§8.2): Claude xulosasi (bo'lmasa — izoh), deterministik topilmalar daraja bo'yicha
 * (shoshilinch → e'tibor → yaxshi) va sklad topilmalari. «Yangilash» — `fresh=1`.
 */
export const FindingsPanel = () => {
  const t = useTranslations("ai.findings");
  const query = useAnalysisQuery();
  const refresh = useRefreshAnalysis();

  return (
    <section aria-labelledby="ai-findings-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h2 id="ai-findings-title" className="font-strong text-lg">
            {t("title")}
          </h2>
          <p className="text-ink-3 text-xs">{t("description")}</p>
        </div>
        <Button
          size="sm"
          className="ml-auto"
          disabled={refresh.isPending}
          aria-busy={refresh.isPending}
          onClick={() => refresh.mutate()}
        >
          <RefreshCw aria-hidden className={cn(refresh.isPending && "animate-spin")} />
          {t(refresh.isPending ? "refreshing" : "refresh")}
        </Button>
      </div>
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
  const lines = summaryLines(analysis.aiSummary);
  return (
    <>
      <div className="panel-surface rounded-3xl border p-4 md:p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles aria-hidden className="text-accent size-4" />
          {t("summary")}
        </h3>
        {lines.length > 0 ? (
          <ol className="text-ink mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        ) : (
          <p className="text-ink-3 mt-2 text-sm">{t("noSummary")}</p>
        )}
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

const FindingItem = ({ finding }: { finding: Finding }) => {
  const t = useTranslations("ai.findings");
  const locale = useLocale();
  const detail = findingDetail(finding, locale);
  const advice = findingAdvice(finding);
  return (
    <li className="bg-surface rounded-2xl border px-4 py-3">
      <div className="text-sm font-semibold">{findingTitle(finding, locale)}</div>
      {detail ? <p className="text-ink-2 mt-1 text-sm">{detail}</p> : null}
      {advice ? (
        <p className="text-ink-2 mt-1.5 text-xs">
          <span className="text-ink font-semibold">{t("advice")}</span> {advice}
        </p>
      ) : null}
    </li>
  );
};
