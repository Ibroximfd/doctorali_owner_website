"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { LOCALES, isLocale, type Locale } from "@/i18n/locales";
import { setLocaleAction } from "@/i18n/set-locale";
import { Segmented } from "@/shared/ui/segmented";

/** Interfeys tili: tanlov cookie ga yoziladi (server action), so'ng sahifa yangi tilda qayta chiziladi. */
export const LanguageSwitch = () => {
  const t = useTranslations("settings.security.language");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const change = (next: Locale) => {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
      // Backend matnlari (signal sarlavhalari, hududlar) ham yangi tilda qayta olinadi.
      await queryClient.invalidateQueries();
    });
  };

  return (
    <Segmented
      ariaLabel={t("description")}
      value={isLocale(locale) ? locale : null}
      onChange={change}
      options={LOCALES.map((value) => ({ value, label: t(`options.${value}`) }))}
    />
  );
};
