"use client";

import { useTranslations } from "next-intl";

import { formatNumber, formatPercent } from "@/shared/lib/format";
import { BarList } from "@/shared/ui/bar-list";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DrawerSection } from "@/shared/ui/drawer";
import { MiniStats } from "@/shared/ui/mini-stats";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useAppDevicesQuery } from "../hooks/use-mobile-app";
import {
  OLDER_VERSIONS_KEY,
  isDevicesEmpty,
  marketLabelKey,
  platformLabelKey,
  totalPlatformUsers,
} from "../model/mobile-app.rules";

const formatWholePercent = (value: number): string => formatPercent(value, 0);

/** Foydalanuvchilar qaysi platformada, qaysi versiyada va qaysi bozorda. */
export const DevicesCard = ({ className }: { className?: string }) => {
  const t = useTranslations("mobileApp.devices");
  const query = useAppDevicesQuery();
  const devices = query.data?.data;

  const platformLabel = (key: string): string => {
    const labelKey = platformLabelKey(key);
    return labelKey ? t(`platform.${labelKey}`) : key;
  };
  const marketLabel = (key: string): string => {
    const labelKey = marketLabelKey(key);
    return labelKey ? t(`market.${labelKey}`) : key;
  };

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={devices ? t("total", { count: formatNumber(totalPlatformUsers(devices)) }) : undefined}
      />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={7} />}
          isEmpty={({ data }) => isDevicesEmpty(data)}
        >
          {({ data }) => (
            <div className="flex flex-col gap-4">
              <MiniStats
                items={data.platform.map((row) => ({
                  key: row.key,
                  label: platformLabel(row.key),
                  value: formatWholePercent(row.sharePct),
                  note: formatNumber(row.users),
                }))}
              />
              <DrawerSection title={t("versions")}>
                <BarList
                  showShare={false}
                  format={formatWholePercent}
                  items={data.versions.map((row) => ({
                    key: row.version,
                    label: row.version === OLDER_VERSIONS_KEY ? t("older") : row.version,
                    value: row.sharePct,
                    hint: row.isLatest ? t("latest") : undefined,
                  }))}
                />
              </DrawerSection>
              <DrawerSection title={t("markets")}>
                <BarList
                  showShare={false}
                  format={formatPercent}
                  barClassName="bg-series-3"
                  items={data.markets.map((row) => ({
                    key: row.key,
                    label: marketLabel(row.key),
                    value: row.sharePct,
                  }))}
                />
              </DrawerSection>
            </div>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
