"use client";

import { motion, useReducedMotion } from "motion/react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { MONEY_LOCATION_BG } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Grid, span } from "@/shared/ui/grid";
import { MetricDelta } from "@/shared/ui/metric-delta";
import { AnimatedNumber } from "@/shared/ui/motion/animated-number";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Pill } from "@/shared/ui/pill";
import { StackedBar } from "@/shared/ui/stacked-bar";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { BlockSkeleton, QueryState, StatRowSkeleton, TableSkeleton } from "@/shared/ui/states";

import { useOverviewQuery } from "../hooks/use-overview";
import { MONEY_STEPS, rankFilials, weakestFilialId } from "../model/overview.rules";
import type { Overview, OverviewFilial } from "../model/overview.schema";

type OverviewScreenProps = {
  /** Sana va davr qatori (`app` beradi). */
  dateline: ReactNode;
  /** AI ning asosiy topilmalari — `features/ai` dan, `app` da yig'iladi. */
  aiSlot: ReactNode;
};

/**
 * «Umumiy» — bir qarashda: pul qancha va qayerda, zakazlar holati (sotildi · yo'lda · yetkazildi ·
 * atkaz), konversiya, filiallar taqqoslanishi va AI ning eng muhim topilmalari.
 */
export const OverviewScreen = ({ dateline, aiSlot }: OverviewScreenProps) => {
  const t = useTranslations("overview");
  const query = useOverviewQuery();

  return (
    <>
      <header className="mb-5 pt-1 md:mb-6 md:pt-2">
        <p className="text-ink-3 mb-1.5 text-sm">{dateline}</p>
        <h1 className="font-display text-3xl leading-tight md:text-4xl">{t("title")}</h1>
      </header>

      <QueryState
        query={query}
        skeleton={
          <div className="flex flex-col gap-4">
            <BlockSkeleton className="h-44 rounded-3xl" />
            <StatRowSkeleton />
          </div>
        }
      >
        {({ data }) => (
          <>
            <MoneyHero overview={data} />
            <OrdersRow overview={data} />
          </>
        )}
      </QueryState>

      <Grid>
        <Card className={span.c8}>
          <CardHeader title={t("filials.title")} description={t("filials.description")} />
          <CardBody flush>
            <QueryState query={query} skeleton={<TableSkeleton rows={3} className="px-5" />}>
              {({ data }) => <FilialsTable rows={data.filials} />}
            </QueryState>
          </CardBody>
        </Card>
        <Card className={span.c4}>
          <CardHeader title={t("ai.title")} description={t("ai.description")} />
          <CardBody>{aiSlot}</CardBody>
        </Card>
      </Grid>
    </>
  );
};

/** Asosiy raqam — tushum, ostida pul zanjiri: kuryerda → bosh kuryerda → filialga topshirildi. */
const MoneyHero = ({ overview }: { overview: Overview }) => {
  const t = useTranslations("overview.money");
  const format = useFormat();
  const reduce = useReducedMotion();
  const { revenue, money } = overview;

  return (
    <motion.section
      aria-labelledby="overview-money"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
      className="panel-surface mb-4 grid gap-5 rounded-3xl border p-4 md:p-6 lg:grid-cols-12 lg:items-center"
    >
      <div className="lg:col-span-5">
        <h2 id="overview-money" className="text-ink-2 text-sm font-medium">
          {t("revenue")}
        </h2>
        <div className="num font-display text-hero mt-1 leading-none">
          <AnimatedNumber value={revenue.value ?? 0} format={format.moneyCompact} />
          <span className="text-ink-3 ml-2 text-xl">{format.currency}</span>
        </div>
        {/* solishtiruv backenddan (B-17): `delta_pct: null` — oldingisi 0, o'zgarish chizilmaydi */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <MetricDelta value={revenue.deltaPct} />
          {revenue.previous === null ? null : (
            <span className="text-ink-3 text-xs">
              {t("previous", { value: format.moneyCompact(revenue.previous) })}
            </span>
          )}
        </div>
      </div>
      <div className="lg:col-span-7">
        <p className="text-ink-2 mb-2.5 text-sm font-medium">{t("whereTitle")}</p>
        <StackedBar
          ariaLabel={t("whereTitle")}
          legend="block"
          format={format.money}
          items={MONEY_STEPS.map((step) => ({
            key: step,
            label: t(`steps.${step}`),
            value: money[step],
            colorClassName: MONEY_LOCATION_BG[step],
          }))}
        />
      </div>
    </motion.section>
  );
};

/** Zakazlar holati va konversiya — oltita raqam, bir qatorda. */
const OrdersRow = ({ overview }: { overview: Overview }) => {
  const t = useTranslations("overview.orders");
  const { orders, conversion, cancelRate } = overview;
  const count = (value: number | null) => formatNumber(value);

  return (
    <StatRow>
      <StatTile label={t("leads")} value={count(orders.leads.value)} delta={orders.leads.deltaPct} />
      <StatTile label={t("sold")} value={count(orders.sold.value)} delta={orders.sold.deltaPct} />
      <StatTile
        label={t("inTransit")}
        value={count(orders.inTransit.value)}
        delta={orders.inTransit.deltaPct}
      />
      <StatTile
        label={t("delivered")}
        value={count(orders.delivered.value)}
        delta={orders.delivered.deltaPct}
      />
      <StatTile
        label={t("cancelled")}
        value={count(orders.cancelled.value)}
        delta={orders.cancelled.deltaPct}
        invertDelta
        note={t("cancelRate", { value: formatPercent(cancelRate.value) })}
      />
      <StatTile
        label={t("conversion")}
        value={formatPercent(conversion.value)}
        delta={conversion.deltaPct}
        note={t("conversionNote")}
      />
    </StatRow>
  );
};

const FilialsTable = ({ rows }: { rows: readonly OverviewFilial[] }) => {
  const t = useTranslations("overview.filials");
  const format = useFormat();
  const ranked = rankFilials(rows);
  const weakest = weakestFilialId(rows);

  const columns: Column<(typeof ranked)[number]>[] = [
    {
      id: "filial",
      header: t("filial"),
      primary: true,
      cell: (row) => (
        <span className="flex items-center gap-2">
          <span className="bg-surface-3 text-2xs rounded-sm px-1.5 py-0.5 font-bold">{row.code}</span>
          <span className="font-semibold">{row.name}</span>
          {row.isMain ? <Star aria-label={t("main")} className="text-warn size-3.5" /> : null}
          {row.id === weakest ? <Pill intent="warn">{t("lowest")}</Pill> : null}
        </span>
      ),
    },
    { id: "sold", header: t("sold"), numeric: true, align: "right", cell: (row) => formatNumber(row.sold) },
    {
      id: "delivered",
      header: t("delivered"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.delivered),
    },
    {
      id: "conversion",
      header: t("conversion"),
      numeric: true,
      align: "right",
      cell: (row) => formatPercent(row.conversionPct),
    },
    {
      id: "cancel",
      header: t("cancelRate"),
      numeric: true,
      align: "right",
      cell: (row) => formatPercent(row.cancelRatePct),
    },
    {
      id: "revenue",
      header: t("revenue"),
      numeric: true,
      align: "right",
      cell: (row) => (
        <span className="inline-flex flex-col items-end gap-1">
          {format.money(row.revenue)}
          {/* kenglik — tushumdagi ulush (hisoblangan qiymat) */}
          <span aria-hidden className="bg-surface-3 block h-1 w-20 overflow-hidden rounded-full">
            <span className="bg-accent block h-full rounded-full" style={{ width: `${row.sharePct}%` }} />
          </span>
        </span>
      ),
    },
  ];

  return <DataTable columns={columns} rows={ranked} rowKey={(row) => String(row.id)} />;
};
