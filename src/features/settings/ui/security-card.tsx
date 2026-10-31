"use client";

import { Moon, ShieldCheck, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Pill } from "@/shared/ui/pill";

import { LanguageSwitch } from "./language-switch";
import { SessionsList } from "./sessions-list";
import { SettingRow } from "./setting-row";

/** Xavfsizlik va ko'rinish: ikki bosqichli kirish, faol qurilmalar, til va mavzu. */
export const SecurityCard = ({
  className,
  twoFactor = null,
}: {
  className?: string;
  /** 2-bosqich usuli — kirishda backend aytgan (`sms | totp`); noma'lum — umumiy matn. */
  twoFactor?: "sms" | "totp" | null;
}) => {
  const t = useTranslations("settings.security");
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <div className="flex flex-col divide-y">
          {/* Ikki bosqichli kirish panelda majburiy — o'chirib bo'lmaydi, shuning uchun faqat holat. */}
          <SettingRow
            title={t("twoFactor.title")}
            description={t(`twoFactor.description.${twoFactor ?? "unknown"}`)}
          >
            <Pill intent="good" icon={ShieldCheck}>
              {t("twoFactor.enabled")}
            </Pill>
          </SettingRow>
          <SessionsList />
          <SettingRow title={t("language.title")} description={t("language.description")}>
            <LanguageSwitch />
          </SettingRow>
          <SettingRow title={t("theme.title")} description={t("theme.description")}>
            <Button
              size="sm"
              aria-label={t("theme.toggleLabel")}
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {/* Ikkala ikon ham chiziladi; qaysi biri ko'rinishini CSS hal qiladi — gidratsiya farqi bo'lmaydi. */}
              <Moon aria-hidden className="dark:hidden" />
              <Sun aria-hidden className="hidden dark:block" />
              {t("theme.toggle")}
            </Button>
          </SettingRow>
        </div>
      </CardBody>
    </Card>
  );
};
