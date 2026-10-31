"use client";

import { useTranslations } from "next-intl";

import { SERIES_BG, seriesFill } from "@/shared/config/chart-palette";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { useRegionName } from "@/shared/meta/use-region-name";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { KvList } from "@/shared/ui/kv-list";
import { RegionMap } from "@/shared/ui/region-map";
import { ChartSkeleton, QueryState } from "@/shared/ui/states";

import { useOverviewQuery, useSelectedSklad, useSkladsQuery } from "../hooks/use-warehouse";
import { skladByRegion, skladColorIndex, skladSummary } from "../model/warehouse.rules";
import type { Sklad, SkladOverview } from "../model/warehouse.schema";

/**
 * Skladlar xaritasi (`GET sklads/` + `overview/`): bitta skladning viloyatlari — bitta rang.
 * Sichqoncha ustida — butun sklad ajraladi va karta: sklad nomi, viloyatlari, bosh kuryeri,
 * qoldiq. Bosilsa — qoldiq jadvali shu skladga torayadi. Yonida — legenda (har sklad).
 */
export const SkladMapCard = ({ className }: { className?: string }) => {
  const t = useTranslations("warehouse.map");
  const sklads = useSkladsQuery();
  const overview = useOverviewQuery();
  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={sklads}
          skeleton={<ChartSkeleton className="h-80" />}
          isEmpty={(data) => data.length === 0}
        >
          {(data) => <SkladMap sklads={data} overview={overview.data} />}
        </QueryState>
      </CardBody>
    </Card>
  );
};

const SkladMap = ({
  sklads,
  overview,
}: {
  sklads: readonly Sklad[];
  overview: SkladOverview | undefined;
}) => {
  const t = useTranslations("warehouse.map");
  const regionName = useRegionName();
  const [selectedSklad, setSelectedSklad] = useSelectedSklad();
  const byRegion = skladByRegion(sklads);
  const colorOf = (sklad: Sklad) => skladColorIndex(sklads, sklad.id);

  return (
    <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
      <div className="lg:col-span-8">
        <RegionMap
          label={t("title")}
          regions={[...byRegion.entries()].map(([code, sklad]) => ({
            code,
            name: regionName(code),
            tone: "none",
            summary: t("regionSummary", { sklad: sklad.name, chief: sklad.chief?.fullName ?? "—" }),
          }))}
          // viloyatni bosish — o'sha viloyat skladini tanlash (yana bosilsa — hammasi)
          selected={null}
          onSelect={(code) => {
            const sklad = code ? byRegion.get(code) : undefined;
            if (sklad) void setSelectedSklad(selectedSklad === sklad.id ? null : sklad.id);
          }}
          hoverCard={false}
          showNames
          groupOf={(code) => {
            const sklad = byRegion.get(code);
            return sklad ? String(sklad.id) : null;
          }}
          fillOf={(code) => {
            const sklad = byRegion.get(code);
            return sklad ? seriesFill(colorOf(sklad)) : undefined;
          }}
          hoverTitle={(code) => byRegion.get(code)?.name ?? regionName(code)}
          hoverDetails={(code) => {
            const sklad = byRegion.get(code);
            return sklad ? (
              <SkladDetails sklad={sklad} overview={overview} />
            ) : (
              <p className="text-ink-3 text-sm">{t("noSklad")}</p>
            );
          }}
          legendItems={<></>}
        />
      </div>
      <ul aria-label={t("legend")} className="flex flex-col gap-2 lg:col-span-4">
        {sklads.map((sklad) => {
          const isActive = selectedSklad === sklad.id;
          return (
            <li key={sklad.id} className="flex items-stretch gap-1.5">
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => void setSelectedSklad(isActive ? null : sklad.id)}
                className={cn(
                  "min-w-0 flex-1 rounded-2xl border px-3.5 py-2.5 text-left transition-colors",
                  isActive ? "border-accent bg-accent-soft" : "hover:bg-surface-2",
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn("size-3 shrink-0 rounded-sm", SERIES_BG[colorOf(sklad) % SERIES_BG.length])}
                  />
                  <span className="font-semibold">{sklad.name}</span>
                  <span className="num text-ink-3 ml-auto text-xs">
                    {t("pcs", { count: formatNumber(skladSummary(sklad, overview).onHand) })}
                  </span>
                </span>
                <span className="text-ink-3 mt-0.5 block truncate pl-5 text-xs">
                  {sklad.regions.map(regionName).join(", ")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const SkladDetails = ({ sklad, overview }: { sklad: Sklad; overview: SkladOverview | undefined }) => {
  const t = useTranslations("warehouse.map");
  const regionName = useRegionName();
  const summary = skladSummary(sklad, overview);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-ink-2 text-xs">{sklad.regions.map(regionName).join(", ")}</p>
      <KvList
        rows={[
          { key: "chief", label: t("chief"), value: sklad.chief?.fullName ?? "—" },
          { key: "stock", label: t("stock"), value: t("pcs", { count: formatNumber(summary.onHand) }) },
          {
            key: "couriers",
            label: t("couriers"),
            value: t("pcs", { count: formatNumber(summary.withCouriers) }),
          },
          { key: "low", label: t("low"), value: formatNumber(summary.lowItems) },
        ]}
      />
    </div>
  );
};
