"use client";

import { useTranslations } from "next-intl";

import { useAiSummaryQuery } from "@/features/ai/hooks/use-ai";
import { useFormat } from "@/shared/hooks/use-format";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { QueryState } from "@/shared/ui/states";

/** Bosh sahifa «brief» yonidagi AI brifingi: so'nggi tekshiruv xulosasi va ochiq topilmalar. */
export const AiBrief = () => {
  const t = useTranslations("overview.brief.ai");
  const format = useFormat();
  const relative = useRelativeTime();
  const query = useAiSummaryQuery();

  return (
    <QueryState
      query={query}
      skeleton={
        <div className="flex flex-col gap-2">
          <span className="skeleton h-3.5 w-32" />
          <span className="skeleton h-3.5 w-full" />
          <span className="skeleton h-3.5 w-4/5" />
        </div>
      }
    >
      {(summary) => (
        <div className="text-ink-2 text-sm leading-relaxed">
          <div className="text-gold mb-1.5 font-semibold">
            {summary.lastRunAt ? t("title", { when: relative(summary.lastRunAt) }) : t("titleNever")}
          </div>
          <p className="text-ink">{summary.headline ?? t("noHeadline")}</p>
          <p className="num text-ink-3 mt-2 text-xs">
            {t("findings", { open: summary.findingsOpen, critical: summary.findingsCritical })}
            {summary.moneyAtRisk > 0
              ? ` · ${t("risk", { value: format.moneyCompact(summary.moneyAtRisk) })}`
              : null}
          </p>
        </div>
      )}
    </QueryState>
  );
};
