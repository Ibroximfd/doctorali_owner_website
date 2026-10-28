"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  BadgeAlert,
  Check,
  Clock3,
  DatabaseZap,
  Lightbulb,
  PackageMinus,
  Scale,
  ShieldAlert,
  TrendingDown,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { routes } from "@/shared/config/routes";
import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { useCanAct } from "@/shared/stores/session-store";
import { Button } from "@/shared/ui/button";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Pill, type PillIntent } from "@/shared/ui/pill";
import { ScopeLink } from "@/shared/ui/scope-link";

import { useEscalateFinding, useFindingFeedback } from "../hooks/use-ai";
import { confidenceLevel, isFindingCategory, type FindingCategory } from "../model/ai.rules";
import type { Finding } from "../model/ai.schema";

const CATEGORY_ICON: Record<FindingCategory, LucideIcon> = {
  shortage: PackageMinus,
  anomaly: TrendingDown,
  fraud_risk: ShieldAlert,
  data_error: DatabaseZap,
  process_delay: Clock3,
  reconciliation: Scale,
};

const SEVERITY: Record<string, { intent: PillIntent; stripe: string }> = {
  critical: { intent: "crit", stripe: "from-crit" },
  high: { intent: "serious", stripe: "from-serious" },
  medium: { intent: "warn", stripe: "from-warn" },
  low: { intent: "info", stripe: "from-info" },
};

const CONFIDENCE_BAR = { high: "bg-good", medium: "bg-warn", low: "bg-ink-3" } as const;

/** Bitta AI topilmasi: nima topildi, qancha pul xavf ostida, dalillar, tavsiya va baho tugmalari. */
export const FindingCard = ({ finding, index }: { finding: Finding; index: number }) => {
  const t = useTranslations("ai.finding");
  const tCategory = useTranslations("ai.category");
  const tSeverity = useTranslations("ai.severity");
  const format = useFormat();
  const reduce = useReducedMotion();
  const feedback = useFindingFeedback();
  const escalate = useEscalateFinding();
  const canAct = useCanAct();
  const severity = SEVERITY[finding.severity] ?? { intent: "neutral" as const, stripe: "from-ink-3" };
  const Icon = isFindingCategory(finding.category) ? CATEGORY_ICON[finding.category] : BadgeAlert;
  const level = confidenceLevel(finding.confidence);
  const isClosed = finding.status === "false_positive" || finding.status === "resolved";

  const rate = (verdict: "confirmed" | "false_positive") =>
    feedback.mutate(
      { id: finding.id, verdict },
      {
        onSuccess: () => toast.success(t(verdict === "confirmed" ? "confirmedToast" : "dismissedToast")),
        onError: () => toast.error(t("failed")),
      },
    );

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: isClosed ? 0.6 : 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE_OUT, delay: Math.min(index, 6) * 0.06 }}
      className="bg-surface hover:shadow-pop relative overflow-hidden rounded-2xl border transition-shadow"
    >
      {/* yuqoridagi nur — jiddiylik rangi */}
      <span
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r to-transparent", severity.stripe)}
      />
      <div className="flex flex-col gap-3.5 p-4 md:p-5">
        <header className="flex items-start gap-3">
          <span className="bg-accent-soft text-accent grid size-10 shrink-0 place-items-center rounded-xl">
            <Icon aria-hidden className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill intent={severity.intent}>
                {finding.severity in SEVERITY ? tSeverity(finding.severity) : finding.severity}
              </Pill>
              <Pill>
                {isFindingCategory(finding.category) ? tCategory(finding.category) : finding.category}
              </Pill>
              {finding.verified ? null : <Pill intent="warn">{t("unverified")}</Pill>}
              <span className="text-2xs text-ink-3 ml-auto">
                {format.date(finding.periodFrom)} – {format.date(finding.periodTo)}
              </span>
            </div>
            <h3 className="text-md mt-1.5 leading-snug font-semibold">{finding.title}</h3>
          </div>
          {finding.amountAtRisk ? (
            <div className="shrink-0 text-right">
              <div className="text-2xs text-ink-3">{t("atRisk")}</div>
              <div className="num text-crit text-lg font-semibold">
                {format.moneyCompact(finding.amountAtRisk)}
              </div>
            </div>
          ) : null}
        </header>

        <p className="text-ink-2 text-sm">{finding.summary}</p>

        {finding.evidence.length > 0 ? (
          <ul aria-label={t("evidence")} className="flex flex-wrap gap-1.5">
            {finding.evidence.map((item, itemIndex) => (
              <li
                key={`${item.source}-${itemIndex}`}
                title={item.source}
                className="bg-surface-2 rounded-lg border px-2.5 py-1.5 text-xs"
              >
                <span className="text-ink-3">{item.label}: </span>
                <span className="num font-semibold">{item.value}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="bg-gold-soft flex gap-2.5 rounded-xl p-3">
          <Lightbulb aria-hidden className="text-gold mt-0.5 size-4 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">{t("advice")} </span>
            {finding.recommendation}
          </p>
        </div>

        <footer className="flex flex-wrap items-center gap-3">
          <div className="min-w-32 flex-1">
            <div className="text-2xs text-ink-3 mb-1 flex justify-between">
              <span>{t(`confidence.${level}`)}</span>
              <span className="num">{finding.confidence}%</span>
            </div>
            <div className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
              {/* kenglik — ishonch foizi */}
              <motion.div
                className={cn("h-full rounded-full", CONFIDENCE_BAR[level])}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${finding.confidence}%` }}
                transition={{ duration: 1, ease: EASE_OUT, delay: 0.3 }}
              />
            </div>
          </div>
          {isClosed || !canAct ? (
            <Pill
              intent={
                finding.status === "resolved" ? "good" : finding.status === "confirmed" ? "good" : "neutral"
              }
            >
              {finding.status === "new" ? t("status.new") : t(`status.${finding.status}`)}
            </Pill>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {finding.status === "confirmed" ? (
                <Pill intent="good" icon={Check}>
                  {t("status.confirmed")}
                </Pill>
              ) : (
                <Button size="sm" disabled={feedback.isPending} onClick={() => rate("confirmed")}>
                  <Check aria-hidden />
                  {t("confirm")}
                </Button>
              )}
              <Button
                size="sm"
                intent="ghost"
                disabled={feedback.isPending}
                onClick={() => rate("false_positive")}
              >
                <X aria-hidden />
                {t("dismiss")}
              </Button>
              {finding.issueId === null ? (
                <Button
                  size="sm"
                  intent="primary"
                  disabled={escalate.isPending}
                  onClick={() =>
                    escalate.mutate(finding.id, {
                      onSuccess: () => toast.success(t("escalatedToast")),
                      onError: () => toast.error(t("failed")),
                    })
                  }
                >
                  <ArrowUpRight aria-hidden />
                  {t("escalate")}
                </Button>
              ) : (
                <Button size="sm" intent="primary" asChild>
                  <ScopeLink href={`${routes.issues}?issue=${finding.issueId}`}>
                    <ArrowUpRight aria-hidden />
                    {t("openIssue")}
                  </ScopeLink>
                </Button>
              )}
            </div>
          )}
        </footer>
      </div>
    </motion.article>
  );
};
