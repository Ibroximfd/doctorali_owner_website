"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Eye, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { Grid, span } from "@/shared/ui/grid";
import { EASE_OUT } from "@/shared/ui/motion/reveal";

import { ACCESS_TABS, useAccessTab } from "../hooks/use-iam";
import { AccessHero } from "./access-hero";
import { AccountDrawer } from "./account-drawer";
import { AccountsView } from "./accounts-view";
import { ActivityCard } from "./activity-card";
import { GrantDrawer } from "./grant-drawer";
import { MembersList } from "./members-list";

const TAB_ICON = { panel: Eye, accounts: UsersRound } as const;

/**
 * «Ruxsatlar» (faqat boshliq): ikki varaq — panelni kim ko'radi (faqat ko'rish) va butun platforma
 * akkauntlari (sklad boshlig'i, filial admini, kuryerlar boshlig'i…) ruxsatlar matritsasi bilan.
 */
export const AccessScreen = () => {
  const t = useTranslations("access.tabs");
  const reduce = useReducedMotion();
  const { tab, setTab } = useAccessTab();

  return (
    <>
      <AccessHero />
      <div
        role="tablist"
        aria-label={t("label")}
        className="bg-surface-2/60 mb-5 flex gap-1 rounded-2xl border p-1 md:max-w-xl"
      >
        {ACCESS_TABS.map((key) => {
          const Icon = TAB_ICON[key];
          const isActive = key === tab;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(key)}
              className={cn(
                "relative flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
                isActive ? "text-accent" : "text-ink-2 hover:text-ink",
              )}
            >
              {isActive ? (
                <motion.span
                  aria-hidden
                  layoutId="access-tab"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="bg-accent/15 absolute inset-0 rounded-xl"
                />
              ) : null}
              <Icon aria-hidden className="relative size-4" />
              <span className="relative">{t(key)}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        >
          {tab === "panel" ? (
            <Grid>
              <MembersList className={span.c8} />
              <ActivityCard className={span.c4} />
            </Grid>
          ) : (
            <AccountsView />
          )}
        </motion.div>
      </AnimatePresence>
      <GrantDrawer />
      <AccountDrawer />
    </>
  );
};
