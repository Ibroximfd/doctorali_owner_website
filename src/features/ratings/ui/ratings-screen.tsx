"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";

import { useRatingsView } from "../hooks/use-ratings";
import { RATING_TABS, type RatingTab } from "../model/ratings.schema";
import { CouriersPanel, LogistsPanel, OperatorsPanel } from "./rating-panels";

const PANEL_ID = "ratings-panel";
const tabId = (tab: RatingTab) => `ratings-tab-${tab}`;

/**
 * «Reytinglar» (TZ 32 §A-3a): kuryerlar (mijoz bahosi, Bayes), operatorlar (yetkazilish ulushi),
 * logistlar (tasdiqlash tezligi). Formulani server tanlaydi — ekranda izoh bilan. Faqat ochiq
 * yorliq so'raladi; ruxsat yo'q yorliq (`section_forbidden`) faqat o'zida «ruxsat yo'q» ko'rsatadi.
 */
export const RatingsScreen = () => {
  const t = useTranslations("ratings.tabs");
  const { tab, setTab } = useRatingsView();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div role="tablist" aria-label={t("label")} className="flex flex-wrap gap-1.5">
        {RATING_TABS.map((key) => {
          const isActive = key === tab;
          return (
            <button
              key={key}
              id={tabId(key)}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={PANEL_ID}
              onClick={() => setTab(key)}
              className={cn(
                "inline-flex h-9.5 items-center rounded-full border px-4 text-sm transition-colors",
                isActive
                  ? "border-accent/40 bg-accent-soft text-accent font-bold"
                  : "text-ink-2 hover:text-ink hover:border-border-strong font-medium",
              )}
            >
              {t(key)}
            </button>
          );
        })}
      </div>
      <div id={PANEL_ID} role="tabpanel" aria-labelledby={tabId(tab)} className="min-w-0">
        {tab === "couriers" ? <CouriersPanel /> : tab === "operators" ? <OperatorsPanel /> : <LogistsPanel />}
      </div>
    </div>
  );
};
