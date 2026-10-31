"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { SEQ_FILL } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { useRegionName } from "@/shared/meta/use-region-name";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { KvList } from "@/shared/ui/kv-list";
import { RegionMap } from "@/shared/ui/region-map";
import { SeqScale } from "@/shared/ui/seq-scale";
import { ChartSkeleton, QueryState } from "@/shared/ui/states";

import { useFinanceQuery } from "../hooks/use-finance";
import { regionSteps } from "../model/finance.rules";
import type { RegionMoney } from "../model/finance.schema";

/**
 * O'zbekiston xaritasi: har viloyat alohida, rang — yetkazilgan pul (kam → ko'p, bitta rang).
 * Sichqoncha viloyat ustida — sotildi, yetkazildi, atkaz va pul; bosilsa raqamlar ostida qoladi
 * (telefonda hover yo'q). Rang yolg'iz emas — raqamlar matnda ham bor.
 */
export const RegionsMapCard = ({ className }: { className?: string }) => {
  const t = useTranslations("finance.map");
  const query = useFinanceQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ChartSkeleton className="h-72" />}
          isEmpty={({ data }) => data.regions.length === 0}
        >
          {({ data }) => <MoneyMap regions={data.regions} />}
        </QueryState>
      </CardBody>
    </Card>
  );
};

const MoneyMap = ({ regions }: { regions: readonly RegionMoney[] }) => {
  const t = useTranslations("finance.map");
  const tScale = useTranslations("common.scale");
  const format = useFormat();
  const regionName = useRegionName();
  const [selected, setSelected] = useState<string | null>(null);
  const steps = regionSteps(regions);
  const byCode = new Map(regions.map((region) => [region.code, region]));
  const picked = selected ? byCode.get(selected) : undefined;

  const details = (region: RegionMoney) => (
    <KvList
      rows={[
        { key: "sold", label: t("sold"), value: formatNumber(region.sold) },
        { key: "delivered", label: t("delivered"), value: formatNumber(region.delivered) },
        { key: "cancelled", label: t("cancelled"), value: formatNumber(region.cancelled) },
        { key: "money", label: t("money"), value: format.money(region.money) },
      ]}
    />
  );

  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
      <div className="lg:col-span-8">
        <RegionMap
          label={t("title")}
          regions={regions.map((region) => ({
            code: region.code,
            name: regionName(region.code),
            tone: "none",
            summary: t("summary", { money: format.money(region.money), sold: formatNumber(region.sold) }),
          }))}
          selected={selected}
          onSelect={setSelected}
          hoverCard={false}
          showNames
          fillOf={(code) => {
            const step = steps.get(code);
            return step === null || step === undefined ? undefined : SEQ_FILL[step];
          }}
          hoverDetails={(code) => {
            const region = byCode.get(code);
            return region ? details(region) : null;
          }}
          legendItems={<SeqScale lowLabel={tScale("low")} highLabel={tScale("high")} />}
        />
      </div>
      <div className="lg:col-span-4" aria-live="polite">
        {picked ? (
          <div>
            <div className="font-display text-xl">{regionName(picked.code)}</div>
            {details(picked)}
          </div>
        ) : (
          <p className="text-ink-3 text-sm">{t("hint")}</p>
        )}
      </div>
    </div>
  );
};
