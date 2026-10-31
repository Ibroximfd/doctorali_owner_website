"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { Banner } from "@/shared/ui/banner";
import { EASE_OUT } from "@/shared/ui/motion/reveal";

import { useAiStatusQuery, useAnalysisQuery } from "../hooks/use-ai";
import { useAiTab, type AiTab } from "../hooks/use-ai-tab";
import { countBySeverity } from "../model/ai.rules";
import { AiHero } from "./ai-hero";
import { AI_PANEL_ID, AiTabs, aiTabId } from "./ai-tabs";
import { ChatPanel } from "./chat-panel";
import { FindingsPanel } from "./findings-panel";

/**
 * «AI tahlil» (v2 §8): «Tahlil» (deterministik topilmalar + Claude xulosasi) doim; «Chat» — faqat
 * `status.enabled` bo'lsa. Status endpointi yo'q yoki AI o'chiq bo'lsa — chat yashirin, izoh bor.
 */
export const AiScreen = () => {
  const t = useTranslations("ai");
  const reduce = useReducedMotion();
  const { tab } = useAiTab();
  const status = useAiStatusQuery();
  const analysis = useAnalysisQuery().data;
  const chatEnabled = status.data?.enabled === true;
  const tabs: AiTab[] = chatEnabled ? ["findings", "chat"] : ["findings"];
  const active: AiTab = tab === "chat" && chatEnabled ? "chat" : "findings";

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <AiHero />
      {status.isPending ? null : chatEnabled ? null : (
        <Banner>{t(status.data ? "chatDisabled" : "statusPending")}</Banner>
      )}
      <AiTabs
        tabs={tabs}
        counts={{ findings: analysis ? countBySeverity(analysis.findings, "urgent") : undefined }}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          id={AI_PANEL_ID}
          role="tabpanel"
          aria-labelledby={aiTabId(active)}
          initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        >
          {active === "chat" ? <ChatPanel /> : <FindingsPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
