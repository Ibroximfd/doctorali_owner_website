"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Pill } from "@/shared/ui/pill";
import { ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useReportsQuery } from "../hooks/use-ai";
import { healthTone } from "../model/ai.rules";
import type { AiReport } from "../model/ai.schema";

const SCORE_TONE = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  crit: "bg-crit-soft text-crit",
} as const;

/** AI kunlik va haftalik hisobotlari: sarlavha + ball; ochilsa — yutuqlar, xavflar, qilinadigan ishlar. */
export const ReportsPanel = () => {
  const t = useTranslations("ai.reports");
  const query = useReportsQuery();
  return (
    <section aria-labelledby="ai-reports-title">
      <h2 id="ai-reports-title" className="font-strong text-lg">
        {t("title")}
      </h2>
      <p className="text-ink-3 mb-3 text-xs">{t("description")}</p>
      <QueryState
        query={query}
        skeleton={<ListSkeleton rows={4} />}
        isEmpty={(rows) => rows.length === 0}
        empty={<StateBlock icon={FileText} title={t("emptyTitle")} description={t("emptyDescription")} />}
      >
        {(rows) => (
          <ul className="flex flex-col gap-2.5">
            {rows.map((report, index) => (
              <ReportItem key={report.id} report={report} defaultOpen={index === 0} />
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  );
};

const ReportItem = ({ report, defaultOpen }: { report: AiReport; defaultOpen: boolean }) => {
  const t = useTranslations("ai.reports");
  const format = useFormat();
  const reduce = useReducedMotion();
  const [isOpen, setOpen] = useState(defaultOpen);
  const sections = [
    { key: "highlights", items: report.highlights, dot: "bg-good" },
    { key: "risks", items: report.risks, dot: "bg-crit" },
    { key: "actions", items: report.actions, dot: "bg-gold" },
  ] as const;

  return (
    <li className="bg-surface overflow-hidden rounded-2xl border">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setOpen((open) => !open)}
        className="hover:bg-surface-2 flex w-full items-center gap-3 p-4 text-left transition-colors"
      >
        {report.healthScore === null ? null : (
          <span
            className={cn(
              "num text-md grid size-11 shrink-0 place-items-center rounded-xl font-semibold",
              SCORE_TONE[healthTone(report.healthScore)],
            )}
          >
            {report.healthScore}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="mb-0.5 flex items-center gap-2">
            <Pill intent={report.kind === "weekly" ? "info" : "neutral"}>
              {report.kind === "weekly" || report.kind === "daily" ? t(`kind.${report.kind}`) : report.kind}
            </Pill>
            <span className="text-2xs text-ink-3">
              {report.periodFrom === report.periodTo
                ? format.date(report.periodFrom)
                : `${format.date(report.periodFrom)} – ${format.date(report.periodTo)}`}
            </span>
          </span>
          <span className="block text-sm font-semibold">{report.headline}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn("text-ink-3 size-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="grid gap-4 border-t p-4 md:grid-cols-3">
              {sections.map((section) => (
                <div key={section.key}>
                  <div className="text-2xs text-ink-3 mb-1.5 font-semibold tracking-wide uppercase">
                    {t(section.key)}
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {section.items.map((item, index) => (
                      <li key={index} className="flex gap-2 text-sm">
                        <span
                          aria-hidden
                          className={cn("mt-2 size-1.5 shrink-0 rounded-full", section.dot)}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
};
