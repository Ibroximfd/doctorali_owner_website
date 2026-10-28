"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";

import { AI_TABS, useAiTab, type AiTab } from "../hooks/use-ai-tab";

export const AI_PANEL_ID = "ai-panel";
export const aiTabId = (key: AiTab) => `ai-tab-${key}`;

/** Pill varaqlar: faol fon bir varaqdan ikkinchisiga «oqib» o'tadi; telefonda qatorga o'raladi. */
export const AiTabs = ({ counts }: { counts: Partial<Record<AiTab, number>> }) => {
  const t = useTranslations("ai.tabs");
  const { tab, setTab } = useAiTab();

  return (
    <div role="tablist" aria-label={t("label")} className="flex flex-wrap gap-1.5">
      {AI_TABS.map((key) => {
        const isActive = key === tab;
        const count = counts[key];
        return (
          <button
            key={key}
            id={aiTabId(key)}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={AI_PANEL_ID}
            onClick={() => setTab(key)}
            className={cn(
              "relative inline-flex h-9.5 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors",
              isActive
                ? "border-accent/40 text-ink font-bold"
                : "text-ink-2 hover:text-ink hover:border-border-strong font-medium",
            )}
          >
            {isActive ? (
              <motion.span
                aria-hidden
                layoutId="ai-tab"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="bg-accent/14 absolute inset-0 rounded-full"
              />
            ) : null}
            <span className="relative">{t(key)}</span>
            {count ? (
              <span className={cn("num relative text-xs", isActive ? "text-accent" : "text-crit")}>
                {formatNumber(count)}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
