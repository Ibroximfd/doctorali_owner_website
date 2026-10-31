"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { routes } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useAnalysisQuery } from "../hooks/use-ai";
import { findingTitle, severityRank, summaryLines } from "../model/ai.rules";

const SHOWN = 3;
const SEVERITY_DOT: Record<string, string> = { urgent: "bg-crit", attention: "bg-warn", good: "bg-good" };

/**
 * «Umumiy» sahifasidagi AI qisqa xulosasi: Claude xulosasining birinchi bandi va eng muhim uchta
 * topilma (daraja nuqtasi + matnda daraja), ostida «AI tahlil» ga havola.
 */
export const AiHighlights = () => {
  const t = useTranslations("ai.highlights");
  const tSeverity = useTranslations("ai.severity");
  const query = useAnalysisQuery();

  return (
    <div className="flex flex-col gap-3.5">
      <QueryState query={query} skeleton={<ListSkeleton rows={4} />}>
        {(analysis) => {
          const top = [...analysis.findings]
            .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
            .slice(0, SHOWN);
          return (
            <>
              <p className="text-ink text-sm leading-relaxed">
                {summaryLines(analysis.aiSummary)[0] ?? t("noHeadline")}
              </p>
              {top.length === 0 ? (
                <p className="text-ink-3 text-sm">{t("none")}</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {top.map((finding, index) => (
                    <li key={`${findingTitle(finding)}-${index}`} className="flex gap-2.5 text-sm">
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          SEVERITY_DOT[finding.severity] ?? "bg-ink-3",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="sr-only">
                          {tSeverity.has(finding.severity) ? tSeverity(finding.severity) : finding.severity}
                          :{" "}
                        </span>
                        {findingTitle(finding)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          );
        }}
      </QueryState>
      <Link
        href={routes.ai}
        className="text-accent mt-auto inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
      >
        {t("open")}
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
};
