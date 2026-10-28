"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { formatNumber } from "@/shared/lib/format";
import { AnimatedNumber } from "@/shared/ui/motion/animated-number";

import { useAiSummaryQuery } from "../hooks/use-ai";
import { AiOrb } from "./ai-orb";
import { ScoreRing } from "./score-ring";

/** Bo'lim boshi: tirik AI shari + sog'liq halqasi, Fraunces sarlavhada ball va xavf ostidagi pul. */
export const AiHero = () => {
  const t = useTranslations("ai.hero");
  const tAi = useTranslations("ai");
  const format = useFormat();
  const relative = useRelativeTime();
  const reduce = useReducedMotion();
  const summary = useAiSummaryQuery().data;
  const score = summary?.healthScore ?? null;

  return (
    <header className="flex flex-col items-start gap-6 py-2 sm:flex-row sm:items-center sm:gap-7">
      <div className="relative size-32 shrink-0 sm:size-36">
        <AiOrb thinking={summary?.status === "running"} className="absolute inset-0" />
        <ScoreRing score={score} label={t("score")} className="absolute inset-0" />
      </div>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="min-w-0"
      >
        <p className="text-ink-3 text-sm font-medium">
          {tAi("title")} · {t("eyebrow")}
        </p>
        <h1 className="font-display text-hero mt-1">
          {t("health")}{" "}
          <span className="num">
            {score === null ? "—" : <AnimatedNumber value={score} format={formatNumber} />}
          </span>
          {score === null ? null : <span className="text-ink-3 text-2xl">/100</span>}
        </h1>
        {score === null ? null : <span className="sr-only">{t("scoreSr", { value: score })}</span>}
        <p className="text-ink-2 text-md mt-2 max-w-2xl">{summary?.headline ?? tAi("description")}</p>
        {summary ? (
          <p className="text-ink-2 mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            <span>
              {t("checksLine", {
                total: formatNumber(summary.checksTotal),
                passed: formatNumber(summary.checksTotal - summary.checksFailed - summary.checksWarn),
              })}
            </span>
            {summary.moneyAtRisk > 0 ? (
              <span>
                {t.rich("atRiskLine", {
                  amount: format.moneyCompact(summary.moneyAtRisk),
                  strong: (chunk) => <strong className="text-crit font-bold">{chunk}</strong>,
                })}
              </span>
            ) : null}
            {summary.status === "running" ? (
              <span className="text-accent">{t("running")}</span>
            ) : summary.lastRunAt ? (
              <span className="text-ink-3">{t("lastRunLine", { time: relative(summary.lastRunAt) })}</span>
            ) : null}
          </p>
        ) : null}
      </motion.div>
    </header>
  );
};
