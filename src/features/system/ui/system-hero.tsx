"use client";

import { useTranslations } from "next-intl";

import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { SystemArt } from "@/shared/ui/illustrations/section-art";
import { HeroStat, SectionHero } from "@/shared/ui/section-hero";

import { useHealthQuery } from "../hooks/use-system";
import { isHealthStatus } from "../model/system.rules";

/** Bo'lim boshi: umumiy holat bir so'zda, 30 kunlik ishlash ulushi va muammoli komponentlar soni. */
export const SystemHero = () => {
  const t = useTranslations("system");
  const relative = useRelativeTime();
  const health = useHealthQuery().data;
  const broken = health?.components.filter((component) => component.status !== "ok").length ?? 0;

  return (
    <SectionHero
      eyebrow={t("hero.eyebrow")}
      title={t("title")}
      description={t("description")}
      art={<SystemArt />}
    >
      {health ? (
        <>
          <HeroStat
            label={t("hero.status")}
            tone={health.status === "ok" ? "default" : "alert"}
            value={isHealthStatus(health.status) ? t(`overall.${health.status}`) : health.status}
          />
          <HeroStat label={t("hero.uptime")} value={formatPercent(health.uptimePct30d, 2)} />
          <HeroStat
            label={t("hero.broken")}
            tone={broken > 0 ? "alert" : "default"}
            value={formatNumber(broken)}
          />
          <HeroStat label={t("hero.checked")} value={relative(health.checkedAt)} />
        </>
      ) : null}
    </SectionHero>
  );
};
