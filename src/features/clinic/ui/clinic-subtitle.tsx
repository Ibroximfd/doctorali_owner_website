"use client";

import { useFormatter, useTranslations } from "next-intl";

import { useScope } from "@/shared/hooks/use-scope";
import { useMetaQuery } from "@/shared/meta/use-meta-query";

import { clinicsInScope } from "../model/clinic.rules";

/** Sahifa sarlavhasi ostidagi qator: bo'lim tavsifi + ko'rsatkichlarga kirgan klinikalar ("Toshkent va Qo'qon"). */
export const ClinicSubtitle = () => {
  const t = useTranslations("clinic");
  const formatter = useFormatter();
  const { scope } = useScope();
  const names = clinicsInScope(scope.filials, useMetaQuery().data?.filials ?? []).map(
    (filial) => filial.name,
  );

  return (
    <>
      {names.length > 0
        ? `${t("description")} · ${formatter.list(names, { type: "conjunction" })}`
        : t("description")}
    </>
  );
};
