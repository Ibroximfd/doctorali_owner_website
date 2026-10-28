"use client";

import { motion, useReducedMotion } from "motion/react";
import { BellRing } from "lucide-react";
import { useTranslations } from "next-intl";

import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { cn } from "@/shared/lib/cn";
import { initialsOf } from "@/shared/lib/format";
import { EASE_OUT } from "@/shared/ui/motion/reveal";

import { isIssueDomain } from "../model/issues.rules";
import type { Issue } from "../model/issues.schema";
import { severityTone } from "./issue-tone";
import { useImpactValue } from "./issue-impact";
import { IssueRing } from "./issue-ring";

type IssueCardProps = {
  issue: Issue;
  selected: boolean;
  onSelect: (id: number) => void;
  /** Ro'yxatdagi o'rni — kirish ketma-ketligi uchun. */
  order: number;
};

/**
 * Muammo kartasi: holat halqasi, domen tegi va yoshi, sarlavha, sabab, summa va mas'ul.
 * Kritiklari ember nur bilan. Butun karta — tugma (tanlaydi / telefonda panelni ochadi).
 */
export const IssueCard = ({ issue, selected, onSelect, order }: IssueCardProps) => {
  const t = useTranslations("issues.board");
  const tDomain = useTranslations("issues.domain");
  const relative = useRelativeTime();
  const impactValue = useImpactValue();
  const reduce = useReducedMotion();
  const tone = severityTone(issue.severity);
  const amount = impactValue(issue.impact);
  const isCritical = issue.severity === "critical";
  const isResolved = issue.status === "resolved";
  const delay = Math.min(order, 8) * 0.07;

  return (
    <motion.li
      layout={reduce ? false : "position"}
      initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={reduce ? undefined : { opacity: 0, x: -24 }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(issue.id)}
        className={cn(
          "group relative flex w-full flex-wrap items-center gap-x-4 gap-y-2.5 rounded-3xl border p-4 text-left transition-colors md:flex-nowrap md:px-4.5",
          isCritical
            ? "border-crit/30 from-crit/10 to-surface/40 shadow-crit/20 bg-linear-to-r shadow-xl"
            : "panel-surface hover:border-border-strong",
          selected && "ring-accent/60 ring-2",
          isResolved && "opacity-70",
          "focus-visible:ring-accent focus-visible:ring-2 focus-visible:outline-none",
        )}
      >
        <IssueRing
          severity={issue.severity}
          status={issue.status}
          detectedAt={issue.detectedAt}
          delay={delay}
        />
        <span className="min-w-0 flex-1 basis-0">
          <span className="text-ink-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-surface-3 text-ink-2 rounded-md px-1.5 py-0.5">
              {isIssueDomain(issue.domain) ? tDomain(issue.domain) : issue.domain}
            </span>
            {issue.filial ? <span>{issue.filial}</span> : null}
            <span>{relative(issue.detectedAt)}</span>
            {issue.notificationsCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                <BellRing aria-hidden className="size-3" />
                {t("notifiedTimes", { count: issue.notificationsCount })}
              </span>
            ) : null}
          </span>
          <span className="text-md mt-1.5 block leading-snug font-bold">{issue.title}</span>
          <span className="text-ink-2 mt-1 line-clamp-2 block text-sm">{issue.cause}</span>
        </span>
        <span className="flex w-full min-w-0 items-center justify-between gap-3 pl-18 md:w-auto md:max-w-56 md:shrink-0 md:flex-col md:items-end md:justify-center md:pl-0">
          {amount ? <span className={cn("num text-lg font-semibold", tone.text)}>{amount}</span> : null}
          <span className="text-ink-2 inline-flex min-w-0 items-center gap-1.5 text-xs">
            <span
              aria-hidden
              className="bg-surface-3 text-ink text-2xs grid size-6 shrink-0 place-items-center rounded-full font-bold"
            >
              {issue.responsible ? initialsOf(issue.responsible.fullName) : "—"}
            </span>
            <span className="truncate">
              {issue.responsible
                ? t("responsible", { name: issue.responsible.fullName, role: issue.responsible.role })
                : t("noResponsible")}
            </span>
          </span>
        </span>
      </button>
    </motion.li>
  );
};
