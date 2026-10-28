"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { EASE_OUT } from "@/shared/ui/motion/reveal";

import { useActionsQuery, useAiSummaryQuery, useFindingsQuery } from "../hooks/use-ai";
import { useAiTab, type AiTab } from "../hooks/use-ai-tab";
import { ActionsPanel } from "./actions-panel";
import { AiAside } from "./ai-aside";
import { AiHero } from "./ai-hero";
import { AI_PANEL_ID, AiTabs, aiTabId } from "./ai-tabs";
import { ChatPanel } from "./chat-panel";
import { ChecksPanel } from "./checks-panel";
import { FindingsPanel } from "./findings-panel";
import { RecommendationsPanel } from "./recommendations-panel";
import { ReportsPanel } from "./reports-panel";

const PANELS: Record<AiTab, () => React.JSX.Element> = {
  chat: ChatPanel,
  findings: FindingsPanel,
  actions: ActionsPanel,
  recommendations: RecommendationsPanel,
  checks: ChecksPanel,
  reports: ReportsPanel,
};

/**
 * «AI tahlil»: chapda — sog'liq sarlavhasi, varaqlar (asosiysi suhbat); o'ngda — AI tuzatishlari
 * va topilmalar (har varaqda ko'rinadi). Telefonda o'ng ustun pastga tushadi.
 */
export const AiScreen = () => {
  const reduce = useReducedMotion();
  const { tab } = useAiTab();
  const summary = useAiSummaryQuery().data;
  const findings = useFindingsQuery("open").data;
  const actions = useActionsQuery("proposed").data;
  const Panel = PANELS[tab];

  return (
    <div className="grid items-start gap-5.5 xl:grid-cols-12">
      <div className="flex min-w-0 flex-col gap-5 xl:col-span-8">
        <AiHero />
        <AiTabs
          counts={{
            findings: findings?.counts.open,
            actions: actions?.counts.proposed,
            checks: summary?.checksFailed,
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
      <AiAside className="xl:col-span-4 xl:pt-2.5" />
    </div>
  );
};
