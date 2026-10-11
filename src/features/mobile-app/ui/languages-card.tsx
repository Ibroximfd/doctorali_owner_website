"use client";

import { useTranslations } from "next-intl";

import { formatPercent } from "@/shared/lib/format";
import { BarList } from "@/shared/ui/bar-list";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useAppDevicesQuery } from "../hooks/use-mobile-app";
import { languageLabelKey } from "../model/mobile-app.rules";

/** Interfeys tili bo'yicha ulushlar — tarjima va kontentni qaysi tilda kuchaytirish kerakligini ko'rsatadi. */
export const LanguagesCard = ({ className }: { className?: string }) => {
  const t = useTranslations("mobileApp.languages");
  const query = useAppDevicesQuery();

  const languageLabel = (key: string): string => {
    const labelKey = languageLabelKey(key);
    return labelKey ? t(`names.${labelKey}`) : key;
  };

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={6} />}
          isEmpty={({ data }) => data.langs.length === 0}
        >
          {({ data }) => (
            <BarList
              showShare={false}
              format={formatPercent}
              items={data.langs.map((row) => ({
                key: row.key,
                label: languageLabel(row.key),
                value: row.sharePct,
              }))}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
