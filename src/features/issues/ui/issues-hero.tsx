"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { formatNumber } from "@/shared/lib/format";
import { IssuesArt } from "@/shared/ui/illustrations/section-art";
import { SectionHero } from "@/shared/ui/section-hero";
import { Segmented } from "@/shared/ui/segmented";

import { ALL_ISSUES, useIssuesQuery } from "../hooks/use-issues";
import { useIssuesFilter } from "../hooks/use-issues-filter";
import { costliest, countByTab, ISSUE_TABS, tabOf } from "../model/issues.rules";
import { useImpactValue } from "./issue-impact";

/**
 * Bo'lim boshi: tahririy jumla (nechta muammo kutyapti, eng qimmati qaysi) va holat
 * almashtirgichi (ochiq · jarayonda · hal bo'ldi) — har birida soni.
 */
export const IssuesHero = () => {
  const t = useTranslations("issues");
  const impactValue = useImpactValue();
  const { tab, setTab } = useIssuesFilter();
  const results = useIssuesQuery(ALL_ISSUES).data?.results;

  const counts = results ? countByTab(results) : null;
  const open = results?.filter((issue) => tabOf(issue.status) === "open") ?? [];
  const top = costliest(open);
  const crit = (chunks: ReactNode) => <span className="text-crit">{chunks}</span>;
  const gold = (chunks: ReactNode) => <span className="text-gold">{chunks}</span>;

  const description = !results
    ? t("description")
    : open.length === 0
      ? t("hero.calm")
      : top
        ? t.rich("hero.summaryTop", {
            count: open.length,
            title: top.title,
            value: impactValue(top.impact) ?? "",
            crit,
            gold,
          })
        : t.rich("hero.summary", { count: open.length, crit });

  return (
    <SectionHero eyebrow={t("hero.eyebrow")} title={t("title")} description={description} art={<IssuesArt />}>
      <Segmented
        tone="hero"
        ariaLabel={t("board.statusFilter")}
        value={tab}
        onChange={setTab}
        options={ISSUE_TABS.map((value) => ({
          value,
          label: counts
            ? t("tabs.withCount", { label: t(`tabs.${value}`), count: formatNumber(counts[value]) })
            : t(`tabs.${value}`),
        }))}
      />
    </SectionHero>
  );
};
