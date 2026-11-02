"use client";

import { KeyRound } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

import { Banner } from "@/shared/ui/banner";
import { EASE_OUT } from "@/shared/ui/motion/reveal";

import { useAiStatusQuery, useAnalysisQuery, useDraftsQuery } from "../hooks/use-ai";
import { useAiPeriod, useAiTab, type AiTab } from "../hooks/use-ai-tab";
import { countBySeverity } from "../model/ai.rules";
import { AiHero } from "./ai-hero";
import { AI_PANEL_ID, AiTabs, aiTabId } from "./ai-tabs";
import { ChatsPanel } from "./chats-panel";
import { DraftsPanel } from "./drafts-panel";
import { FindingsPanel } from "./findings-panel";
import { UsagePanel } from "./usage-panel";

const PANELS: Record<AiTab, ComponentType> = {
  findings: FindingsPanel,
  chat: ChatsPanel,
  drafts: DraftsPanel,
  usage: UsagePanel,
};

/**
 * «AI tahlil» (TZ 32 §I, §C-2): tahlil · chat · AI loyihalari · xarajat — to'rt varaq doim ko'rinadi.
 * Kalitsiz rejimda (`status.enabled` yoki `analysis.ai_available` — `false`) tepada aniq izoh:
 * hisoblangan topilmalar ishlaydi, AI xulosasi va chat kalit qo'yilgach o'zi yoqiladi.
 */
export const AiScreen = () => {
  const t = useTranslations("ai");
  const reduce = useReducedMotion();
  const { tab } = useAiTab();
  const { period } = useAiPeriod();
  const status = useAiStatusQuery();
  const analysis = useAnalysisQuery(period).data;
  const drafts = useDraftsQuery("draft").data;
  const noKey = status.data?.enabled === false || analysis?.aiAvailable === false;
  const Panel = PANELS[tab];

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <AiHero />
      {noKey ? <Banner icon={KeyRound}>{t("noKey")}</Banner> : null}
      <AiTabs
        counts={{
          findings: analysis ? countBySeverity(analysis.findings, "urgent") : undefined,
          drafts: drafts?.length,
        }}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          id={AI_PANEL_ID}
          role="tabpanel"
          aria-labelledby={aiTabId(tab)}
          initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        >
          <Panel />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
