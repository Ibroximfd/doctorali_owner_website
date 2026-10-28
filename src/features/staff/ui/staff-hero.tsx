"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { formatDecimal } from "@/shared/lib/format";
import { PulseArt } from "@/shared/ui/illustrations/pulse-art";
import { SectionHero } from "@/shared/ui/section-hero";

import { useLeaderboardQuery, useStaffView } from "../hooks/use-staff";
import { leadColumn, leaderInsight } from "../model/staff.rules";
import { useMetricFormat, useMetricLabel } from "./metric-format";
import { RoleTabs } from "./role-tabs";

const gold = (chunks: ReactNode) => <span className="text-gold">{chunks}</span>;
const mint = (chunks: ReactNode) => <span className="text-accent">{chunks}</span>;

/**
 * Bo'lim boshi: tahririy jumla — yetakchi va uning asosiy ko'rsatkichi jamoa o'rtachasidan
 * necha barobar (ma'lumotdan hosil qilinadi), ostida rol almashtirgich.
 */
export const StaffHero = () => {
  const t = useTranslations("staff");
  const tRole = useTranslations("staff.roles");
  const formatMetric = useMetricFormat();
  const metricLabel = useMetricLabel();
  const { role } = useStaffView();
  const board = useLeaderboardQuery().data?.data;
  const lead = board ? leadColumn(board.columns) : null;
  const insight = board && lead ? leaderInsight(board.rows, lead.key) : null;

  return (
    <SectionHero
      eyebrow={t("hero.eyebrow", { role: tRole(role) })}
      title={t("title")}
      description={
        insight && lead
          ? t.rich("hero.lead", {
              name: insight.leader.fullName,
              metric: metricLabel(lead.key),
              value: formatMetric(insight.value, lead.unit),
              ratio: formatDecimal(insight.ratio),
              gold,
              mint,
            })
          : t("description")
      }
      art={<PulseArt />}
    >
      <RoleTabs />
    </SectionHero>
  );
};
