"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { isRegionCode } from "@/shared/config/regions";
import { UZ_MAP_VIEWBOX, focusViewBox, projectLatLng } from "@/shared/config/uz-map";
import { useFormat } from "@/shared/hooks/use-format";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { cn } from "@/shared/lib/cn";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { useRegionName } from "@/shared/meta/use-region-name";
import { Card, CardHeader } from "@/shared/ui/card";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { RegionMap, TONE_CLASS } from "@/shared/ui/region-map";
import { Segmented } from "@/shared/ui/segmented";
import { BlockSkeleton, QueryState } from "@/shared/ui/states";

import { useRegionLiveQuery, useRegionsQuery } from "../hooks/use-regions";
import { MAP_METRICS, metricTone, type MapMetric } from "../model/regions.rules";
import type { RegionLive, RegionRow } from "../model/regions.schema";
import { RegionArcs } from "./region-arcs";
import { FloatingLabels, type MapLabel } from "./region-labels";
import { RegionLivePanel } from "./region-live-panel";
import { RegionMarkers } from "./region-markers";
import { RegionRanking } from "./region-ranking";

type RegionExplorerProps = {
  initialMetric?: MapMetric;
  /** Sahna ostidagi tasma (masalan, jonli lenta «ticker»i) — kompozitsiya `app` da. */
  footer?: ReactNode;
  className?: string;
};

/**
 * O'zbekiston «observatoriyasi»: to'r fonli sahna, Toshkentdan viloyatlarga tilla yoylar,
 * har viloyat nomi xaritada; sichqoncha ostida asosiy raqamlar kartasi; o'ngda reyting. Viloyat bosilsa kamera unga
 * xiralashib yaqinlashadi: omborlar, kuryerlar va ularning yo'llari xaritada, HUD plitkalarda
 * qisqa raqamlar, yon panelda ogohlantirish, kuryer kartalari va kun oqimi.
 */
export const RegionExplorer = ({ initialMetric = "delivery", footer, className }: RegionExplorerProps) => {
  const t = useTranslations("regions");
  const regionName = useRegionName();
  const format = useFormat();
  const query = useRegionsQuery();
  const [metric, setMetric] = useState<MapMetric>(initialMetric);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeCourier, setActiveCourier] = useState<number | null>(null);
  const live = useRegionLiveQuery(selected);
  const liveData = live.data?.data;
  const zoomCode = selected !== null && isRegionCode(selected) ? selected : null;
  const viewBox = zoomCode ? focusViewBox(zoomCode) : UZ_MAP_VIEWBOX;

  const summaryOf = (row: RegionRow): string => {
    if (metric === "stock")
      return t("summary.stock", { units: formatNumber(row.stockUnits), low: row.lowSkus });
    if (metric === "couriers")
      return t("summary.couriers", {
        working: row.couriersWorking,
        total: row.couriersTotal,
        cash: format.moneyCompact(row.cashOnCouriers),
      });
    return t("summary.delivery", { rate: formatPercent(row.successRate), orders: formatNumber(row.orders) });
  };

  const select = (code: string | null) => {
    setSelected(code);
    setActiveCourier(null);
  };

  return (
    <Card className={cn("relative isolate overflow-hidden", className)}>
      {/* sahna: o'rtada xira yorug'lik va chetga so'nuvchi to'r (statik — xarita qotmasin) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="from-accent/10 absolute inset-0 bg-radial to-transparent to-70%" />
        <div className="grid-lines absolute inset-0 mask-radial-from-30% mask-radial-to-75%" />
      </div>

      <CardHeader
        title={t("title")}
        description={selected ? t("descriptionZoomed") : t("hint")}
        action={
          <Segmented
            ariaLabel={t("metric")}
            value={metric}
            onChange={setMetric}
            options={MAP_METRICS.map((key) => ({ value: key, label: t(`metrics.${key}`) }))}
          />
        }
        className="flex-wrap"
      />

      <QueryState
        query={query}
        skeleton={<BlockSkeleton className="m-4 h-96 md:m-5.5" />}
        isEmpty={({ data }) => data.length === 0}
      >
        {({ data }) => (
          <div className="grid lg:grid-cols-12">
            <div className="min-w-0 px-4 pt-3 pb-4 md:px-5.5 lg:col-span-8">
              <RegionMap
                label={t("mapLabel")}
                selected={selected}
                onSelect={select}
                zoomed
                hoverCard={false}
                showNames
                hoverDetails={(code) => {
                  const row = data.find((item) => item.region === code);
                  return row ? <RegionHoverDetails row={row} /> : null;
                }}
                legend={{
                  good: t(`legend.${metric}.good`),
                  fair: t(`legend.${metric}.fair`),
                  watch: t(`legend.${metric}.watch`),
                  bad: t(`legend.${metric}.bad`),
                }}
                legendExtra={
                  selected ? null : (
                    <>
                      <li className="flex items-center gap-1.5">
                        <span aria-hidden className="bg-gold size-2.5 rotate-45 rounded-xs" />
                        {t("legendHub")}
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span aria-hidden className="bg-gold h-0.5 w-4 rounded-full" />
                        {t("legendArcs")}
                      </li>
                    </>
                  )
                }
                regions={data.map((row) => ({
                  code: row.region,
                  name: regionName(row.region),
                  tone: metricTone(row, metric),
                  summary: summaryOf(row),
                }))}
                overlay={(scale) =>
                  selected === null ? (
                    <RegionArcs
                      regions={data.map((row) => ({
                        code: row.region,
                        orders: row.orders,
                        tone: metricTone(row, metric),
                      }))}
                    />
                  ) : liveData && liveData.region === selected ? (
                    <RegionMarkers
                      couriers={liveData.couriers}
                      warehouses={liveData.warehouses}
                      scale={scale}
                      activeCourier={activeCourier}
                    />
                  ) : null
                }
                htmlOverlay={
                  selected === null ? null : (
                    <ZoomOverlay
                      key={selected}
                      name={regionName(selected)}
                      live={liveData && liveData.region === selected ? liveData : undefined}
                      viewBox={viewBox}
                      onBack={() => select(null)}
                    />
                  )
                }
              />
              {selected && liveData && liveData.region === selected ? <RegionHud live={liveData} /> : null}
            </div>

            <aside className="border-t px-4 pt-4 pb-4 md:px-5.5 lg:col-span-4 lg:border-t-0 lg:border-l lg:pt-3">
              <AnimatePresence mode="wait" initial={false}>
                {selected ? (
                  <RegionLivePanel
                    key={selected}
                    query={live}
                    activeCourier={activeCourier}
                    onCourier={setActiveCourier}
                  />
                ) : (
                  <RegionRanking key={metric} rows={data} metric={metric} onPick={select} />
                )}
              </AnimatePresence>
            </aside>
          </div>
        )}
      </QueryState>

      {footer ? <div className="border-t">{footer}</div> : null}
    </Card>
  );
};

/**
 * Yaqinlashgan xarita ustidagi qatlam: orqaga qaytish, katta viloyat sarlavhasi, chetlarni
 * so'ndiruvchi vinyetka; ombor va aloqasiz kuryerlar suzuvchi yorliq bilan.
 */
const ZoomOverlay = ({
  name,
  live,
  viewBox,
  onBack,
}: {
  name: string;
  live: RegionLive | undefined;
  viewBox: string;
  onBack: () => void;
}) => {
  const t = useTranslations("regions");
  const relative = useRelativeTime();
  const reduce = useReducedMotion();

  const labels: MapLabel[] = live
    ? [
        ...live.warehouses.flatMap((warehouse) =>
          warehouse.lat === null || warehouse.lng === null
            ? []
            : [
                {
                  key: `w-${warehouse.id}`,
                  point: projectLatLng(warehouse.lat, warehouse.lng),
                  title: warehouse.name,
                  value: t("live.warehouseLabel", { units: formatNumber(warehouse.stockUnits) }),
                  tone: warehouse.products.some((product) => product.status !== "ok")
                    ? ("fair" as const)
                    : ("good" as const),
                },
              ],
        ),
        ...live.couriers.flatMap((courier) =>
          courier.status !== "no_signal" || courier.lat === null || courier.lng === null
            ? []
            : [
                {
                  key: `c-${courier.id}`,
                  point: projectLatLng(courier.lat, courier.lng),
                  title: courier.fullName,
                  value: t("live.noSignalLabel", {
                    when: courier.lastSignalAt ? relative(courier.lastSignalAt) : "—",
                  }),
                  tone: "bad" as const,
                },
              ],
        ),
      ]
    : [];

  return (
    <>
      <div className="to-bg/80 absolute inset-0 bg-radial from-transparent from-55%" />
      <FloatingLabels labels={labels} viewBox={viewBox} delay={1} />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.9, delay: reduce ? 0 : 0.5, ease: EASE_OUT }}
        className="absolute top-2 left-2 md:top-4 md:left-4"
      >
        <button
          type="button"
          onClick={onBack}
          aria-label={t("live.back")}
          className="bg-bg/85 text-ink-2 hover:text-ink pointer-events-auto inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-xs"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          {t("country")}
        </button>
        <h3 className="font-display text-hero mt-2 leading-none">{name}</h3>
        {live ? (
          <p className="text-ink-2 mt-1.5 hidden text-sm md:block">
            {t("zoomSubtitle", {
              couriers: live.couriers.length,
              warehouses: live.warehouses.length,
              orders: live.summary.ordersToday,
            })}
          </p>
        ) : null}
      </motion.div>
      <span className="text-mint absolute top-3 right-3 hidden items-center gap-2 text-xs font-semibold md:inline-flex">
        <span aria-hidden className="relative flex size-2">
          <span className="bg-accent animate-ping-soft absolute inset-0 rounded-full" />
          <span className="bg-accent relative size-2 rounded-full" />
        </span>
        {t("live.live")}
      </span>
    </>
  );
};

/** Viloyat qisqa raqamlari (HUD) — xarita ostida shisha plitkalar. */
const RegionHud = ({ live }: { live: RegionLive }) => {
  const t = useTranslations("regions.live");
  const format = useFormat();
  const reduce = useReducedMotion();
  const { summary } = live;
  const tiles = [
    {
      key: "stock",
      label: t("stock"),
      value: formatNumber(summary.stockUnits),
      tone: summary.lowSkus > 0 ? "text-warn" : "text-gold",
    },
    { key: "cash", label: t("cash"), value: format.moneyCompact(summary.cashOnCouriers), tone: "text-ink" },
    { key: "transit", label: t("inTransit"), value: formatNumber(summary.inTransit), tone: "text-ink" },
    {
      key: "delivered",
      label: t("delivered"),
      value: `${formatNumber(summary.deliveredToday)} / ${formatNumber(summary.ordersToday)}`,
      tone: "text-good",
    },
  ];

  return (
    <dl className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
      {tiles.map((tile, index) => (
        <motion.div
          key={tile.key}
          initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: reduce ? 0 : 0.9 + index * 0.1, ease: EASE_OUT }}
          className="bg-bg/85 rounded-2xl border px-3.5 py-2.5"
        >
          <dt className="text-ink-2 text-xs">{tile.label}</dt>
          <dd className={cn("num text-kpi mt-1 font-semibold", tile.tone)}>{tile.value}</dd>
        </motion.div>
      ))}
    </dl>
  );
};

/** Sichqoncha ostidagi viloyat: asosiy raqamlar (batafsil — bosilganda). */
const RegionHoverDetails = ({ row }: { row: RegionRow }) => {
  const t = useTranslations("regions.hover");
  const format = useFormat();
  const items = [
    { key: "orders", value: formatNumber(row.orders), tone: "text-ink" },
    {
      key: "delivered",
      value: row.successRate === null ? "—" : formatPercent(row.successRate),
      tone: TONE_CLASS[metricTone(row, "delivery")].text,
    },
    { key: "revenue", value: format.moneyCompact(row.revenue), tone: "text-gold" },
    { key: "couriers", value: `${row.couriersWorking}/${row.couriersTotal}`, tone: "text-ink" },
    {
      key: row.lowSkus > 0 ? "stockLow" : "stock",
      value: row.lowSkus > 0 ? t("lowSkus", { count: row.lowSkus }) : formatNumber(row.stockUnits),
      tone: row.lowSkus > 0 ? "text-warn" : "text-ink",
    },
  ] as const;

  return (
    <>
      <dl className="space-y-1 text-xs">
        {items.map((item) => (
          <div key={item.key} className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-2">{t(item.key)}</dt>
            <dd className={cn("num text-right font-semibold", item.tone)}>{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-accent text-2xs mt-2.5 border-t pt-2">{t("open")}</p>
    </>
  );
};
