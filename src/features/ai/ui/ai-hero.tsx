"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";

import { useAiStatusQuery, useAnalysisQuery } from "../hooks/use-ai";
import { countBySeverity } from "../model/ai.rules";
import { AiOrb } from "./ai-orb";

/** Bo'lim boshi: tirik AI shari, sarlavha va holat qatori (model, oxirgi tahlil, topilmalar soni). */
export const AiHero = () => {
  const t = useTranslations("ai.hero");
  const tAi = useTranslations("ai");
  const format = useFormat();
  const reduce = useReducedMotion();
  const status = useAiStatusQuery();
  const analysis = useAnalysisQuery().data;
  const model = status.data?.model ?? analysis?.model ?? null;

  return (
    <header className="flex flex-col items-start gap-5 py-2 sm:flex-row sm:items-center sm:gap-7">
      <div className="relative size-24 shrink-0 sm:size-28">
        <AiOrb thinking={false} className="absolute inset-0" />
      </div>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="min-w-0"
      >
        <h1 className="font-display text-hero">{tAi("title")}</h1>
        <p className="text-ink-2 text-md mt-2 max-w-2xl">{tAi("description")}</p>
        <p className="text-ink-2 mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {analysis ? (
            <span>
              {t("findingsLine", {
                urgent: formatNumber(countBySeverity(analysis.findings, "urgent")),
                attention: formatNumber(countBySeverity(analysis.findings, "attention")),
              })}
            </span>
          ) : null}
          {analysis ? (
            <span className="text-ink-3">
              {t("generated", { time: format.dateTime(analysis.generatedAt) })}
            </span>
          ) : null}
          {model ? <span className="text-ink-3">{t("model", { model })}</span> : null}
          {status.data && !status.data.enabled ? <span className="text-warn">{t("disabled")}</span> : null}
        </p>
      </motion.div>
    </header>
  );
};
