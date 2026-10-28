"use client";

import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { formatNumber } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { AccessArt } from "@/shared/ui/illustrations/section-art";
import { AnimatedNumber } from "@/shared/ui/motion/animated-number";
import { HeroStat, SectionHero } from "@/shared/ui/section-hero";

import { useGrantDrawer, useMembersQuery } from "../hooks/use-access";
import { useDepartmentsQuery } from "../hooks/use-iam";
import { isExpiringSoon } from "../model/access.rules";

const accent = (chunks: ReactNode) => <span className="text-accent">{chunks}</span>;

/** Bo'lim boshi: nechta odamga ruxsat ochiq, qanchasi tugayapti, «Ruxsat berish» tugmasi. */
export const AccessHero = () => {
  const t = useTranslations("access");
  const { openNew } = useGrantDrawer();
  // «hozir» — javob olingan vaqt: render toza qoladi, ro'yxat yangilanganda o'zi yangilanadi
  const { data: members, dataUpdatedAt: now } = useMembersQuery();
  const departments = useDepartmentsQuery().data;
  const accounts = departments?.reduce((sum, item) => sum + item.accountsCount, 0) ?? 0;
  const active = members?.filter((member) => member.status === "active" || member.status === "pending") ?? [];

  return (
    <SectionHero
      eyebrow={t("hero.eyebrow")}
      title={t("title")}
      description={accounts > 0 ? t.rich("hero.lead", { count: accounts, b: accent }) : t("description")}
      art={<AccessArt />}
    >
      <Button
        intent="primary"
        size="lg"
        onClick={openNew}
        className="bg-gold text-forest hover:brightness-110"
      >
        <UserPlus aria-hidden />
        {t("hero.grant")}
      </Button>
      {members ? (
        <>
          <HeroStat
            label={t("hero.active")}
            value={<AnimatedNumber value={active.length} format={formatNumber} />}
          />
          <HeroStat
            label={t("hero.expiring")}
            tone={members.some((member) => isExpiringSoon(member, now)) ? "alert" : "default"}
            value={formatNumber(members.filter((member) => isExpiringSoon(member, now)).length)}
          />
        </>
      ) : null}
    </SectionHero>
  );
};
