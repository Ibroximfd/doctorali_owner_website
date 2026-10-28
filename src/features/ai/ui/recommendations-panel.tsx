"use client";

import { motion, useReducedMotion } from "motion/react";
import { Rocket, Sparkles, Timer, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Pill } from "@/shared/ui/pill";
import { BlockSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useRecommendationsQuery } from "../hooks/use-ai";
import { sortRecommendations } from "../model/ai.rules";

const KNOWN_HORIZONS = ["now", "week", "month"];
const KNOWN_EFFORTS = ["low", "medium", "high"];

/** O'sish va yechim tavsiyalari: nima qilish, nega va qanday natija kutiladi. Eng muhimi — birinchi. */
export const RecommendationsPanel = () => {
  const t = useTranslations("ai.recommendations");
  const tArea = useTranslations("ai.area");
  const reduce = useReducedMotion();
  const query = useRecommendationsQuery();

  return (
    <section aria-labelledby="ai-rec-title">
      <h2 id="ai-rec-title" className="font-strong text-lg">
        {t("title")}
      </h2>
      <p className="text-ink-3 mb-3 text-xs">{t("description")}</p>
      <QueryState
        query={query}
        skeleton={<BlockSkeleton className="h-64" />}
        isEmpty={(rows) => rows.length === 0}
        empty={<StateBlock icon={Sparkles} title={t("emptyTitle")} description={t("emptyDescription")} />}
      >
        {(rows) => (
          <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sortRecommendations(rows).map((row, index) => (
              <motion.li
                key={row.id}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE_OUT, delay: Math.min(index, 6) * 0.06 }}
                className={cn(
                  "bg-surface relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4",
                  index === 0 && "border-gold/60 md:col-span-2 xl:col-span-1",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="num text-gilded text-3xl leading-none font-semibold">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap gap-1.5">
                      <Pill intent="info">{tArea.has(row.area) ? tArea(row.area) : row.area}</Pill>
                      {KNOWN_HORIZONS.includes(row.horizon) ? (
                        <Pill icon={Timer}>{t(`horizon.${row.horizon}`)}</Pill>
                      ) : null}
                      {KNOWN_EFFORTS.includes(row.effort) ? (
                        <Pill icon={Zap}>{t(`effort.${row.effort}`)}</Pill>
                      ) : null}
                    </div>
                    <h3 className="text-md leading-snug font-semibold">{row.title}</h3>
                  </div>
                </div>
                <p className="text-ink-2 text-sm">{row.rationale}</p>
                <div className="bg-good-soft text-good mt-auto flex gap-2 rounded-xl p-3 text-sm">
                  <Rocket aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <span className="font-semibold">{t("effect")} </span>
                    {row.expectedEffect}
                  </span>
                </div>
              </motion.li>
            ))}
          </ol>
        )}
      </QueryState>
    </section>
  );
};
