"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { STATUS_COLORS } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { useOrderSource } from "@/shared/hooks/use-order-source";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ChartCard } from "@/shared/ui/chart-card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Grid, span } from "@/shared/ui/grid";
import { Meter } from "@/shared/ui/meter";
import { MetricDelta } from "@/shared/ui/metric-delta";
import { Pill } from "@/shared/ui/pill";
import { ProductThumb } from "@/shared/ui/product-thumb";
import { Segmented } from "@/shared/ui/segmented";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { ChartSkeleton, EmptyState, QueryState, StatRowSkeleton, TableSkeleton } from "@/shared/ui/states";

import { useAnalyticsQuery, useOperatorsFilial } from "../hooks/use-analytics";
import { operatorsOf, rankProducts, versusAverage } from "../model/analytics.rules";
import type { Analytics, AnalyticsFilial, OperatorRow, ProductRow } from "../model/analytics.schema";

/**
 * «Analitika» (tuzilma v2 §12.3): sotuv, atkaz, konversiya — avval jami, keyin filiallar
 * taqqoslanadi, so'ng mahsulotlar va filial ichida operatorlar.
 */
export const AnalyticsScreen = () => {
  const t = useTranslations("analytics");
  const query = useAnalyticsQuery();

  return (
    <>
      <QueryState query={query} skeleton={<StatRowSkeleton />}>
        {({ data }) => <Totals analytics={data} />}
      </QueryState>

      <Grid>
        <div className={span.c7}>
          {/* kunlik trend — analytics/v2 `trend` (B-19); davrda kun yo'q bo'lsa — bo'sh holat */}
          <QueryState
            query={query}
            skeleton={<ChartSkeleton />}
            isEmpty={({ data }) => data.trend.labels.length === 0}
          >
            {({ data, period }) => <SalesTrend analytics={data} granularity={period.granularity} />}
          </QueryState>
        </div>
        <Card className={span.c5}>
          <CardHeader title={t("filials.title")} description={t("filials.description")} />
          <CardBody flush>
            <QueryState query={query} skeleton={<TableSkeleton rows={3} className="px-5" />}>
              {({ data }) => <FilialsTable rows={data.filials} />}
            </QueryState>
          </CardBody>
        </Card>
        <Card className={span.full}>
          <CardHeader title={t("operators.title")} description={t("operators.description")} />
          <CardBody flush>
            <QueryState
              query={query}
              skeleton={<TableSkeleton rows={5} className="px-5" />}
              isEmpty={({ data }) => data.filials.length === 0}
            >
              {({ data }) => <OperatorsBlock analytics={data} />}
            </QueryState>
          </CardBody>
        </Card>
        <Card className={span.full}>
          <CardHeader title={t("products.title")} description={t("products.description")} />
          <CardBody flush>
            <QueryState
              query={query}
              skeleton={<TableSkeleton rows={6} className="px-5" />}
              isEmpty={({ data }) => data.products.length === 0}
            >
              {({ data }) => <ProductsTable rows={data.products} />}
            </QueryState>
          </CardBody>
        </Card>
      </Grid>
    </>
  );
};

const Totals = ({ analytics }: { analytics: Analytics }) => {
  const t = useTranslations("analytics.kpis");
  const { totals } = analytics;
  return (
    <StatRow>
      <StatTile label={t("leads")} value={formatNumber(totals.leads)} />
      <StatTile label={t("sold")} value={formatNumber(totals.sold)} />
      <StatTile label={t("delivered")} value={formatNumber(totals.delivered)} />
      <StatTile label={t("cancelled")} value={formatNumber(totals.cancelled)} />
      <StatTile
        label={t("conversion")}
        value={formatPercent(totals.conversionPct)}
        note={t("conversionNote")}
      />
      <StatTile
        label={t("cancelRate")}
        value={formatPercent(totals.cancelRatePct)}
        note={t("cancelRateNote")}
      />
    </StatRow>
  );
};

const SalesTrend = ({
  analytics,
  granularity,
}: {
  analytics: Analytics;
  granularity: "hour" | "day" | "week" | "month";
}) => {
  const t = useTranslations("analytics.trend");
  const format = useFormat();
  return (
    <ChartCard
      title={t("title")}
      description={t("description")}
      kind="columns"
      columnLabel={t("period")}
      formatValue={formatNumber}
      data={{
        labels: analytics.trend.labels.map((label) => format.bucket(label, granularity)),
        series: [
          { key: "sold", name: t("sold"), color: STATUS_COLORS.confirmed, values: analytics.trend.sold },
          {
            key: "delivered",
            name: t("delivered"),
            color: STATUS_COLORS.delivered,
            values: analytics.trend.delivered,
          },
          {
            key: "cancelled",
            name: t("cancelled"),
            color: STATUS_COLORS.cancelled,
            values: analytics.trend.cancelled,
          },
        ],
      }}
    />
  );
};

const FilialCell = ({ code, name }: { code: string; name: string }) => (
  <span className="flex items-center gap-2">
    <span className="bg-surface-3 text-2xs rounded-sm px-1.5 py-0.5 font-bold">{code}</span>
    <span className="font-semibold">{name}</span>
  </span>
);

const FilialsTable = ({ rows }: { rows: readonly AnalyticsFilial[] }) => {
  const t = useTranslations("analytics.filials");
  const best = Math.max(0, ...rows.map((row) => row.conversionPct ?? 0));

  const columns: Column<AnalyticsFilial>[] = [
    {
      id: "filial",
      header: t("filial"),
      primary: true,
      cell: (row) => <FilialCell code={row.code} name={row.name} />,
    },
    { id: "sold", header: t("sold"), numeric: true, align: "right", cell: (row) => formatNumber(row.sold) },
    {
      id: "conversion",
      header: t("conversion"),
      cell: (row) => (
        <span className="flex items-center gap-2">
          <Meter
            className="w-16"
            value={best > 0 ? ((row.conversionPct ?? 0) / best) * 100 : 0}
            ariaLabel={t("conversionLabel", { name: row.name, value: formatPercent(row.conversionPct) })}
          />
          <span className="num font-semibold">{formatPercent(row.conversionPct)}</span>
        </span>
      ),
    },
    {
      id: "cancel",
      header: t("cancelRate"),
      numeric: true,
      align: "right",
      cell: (row) => formatPercent(row.cancelRatePct),
    },
  ];
  return <DataTable columns={columns} rows={rows} rowKey={(row) => String(row.id)} />;
};

/** Filial tanlanadi (varaq), ostida shu filial operatorlari — konversiya va filial o'rtachasidan farq. */
const OperatorsBlock = ({ analytics }: { analytics: Analytics }) => {
  const t = useTranslations("analytics.operators");
  const [team, setTeam] = useOperatorsFilial();
  const [source] = useOrderSource();
  // ilova zakazida operator ishtirok etmaydi — jadval o'rniga tushuntirish
  if (source === "app") return <EmptyState title={t("appOnlyTitle")} description={t("appOnlyDescription")} />;
  const first = analytics.filials[0];
  const active = analytics.filials.find((filial) => filial.id === team) ?? first;
  if (!active) return null;
  const rows = operatorsOf(analytics.operators, active.id);

  return (
    <div>
      <div className="px-4 pb-2 md:px-5.5">
        <Segmented
          ariaLabel={t("filialPicker")}
          value={String(active.id)}
          onChange={(value) => void setTeam(Number(value))}
          options={analytics.filials.map((filial) => ({
            value: String(filial.id),
            label: `${filial.code} · ${filial.name}`,
          }))}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <OperatorsTable rows={rows} average={active.conversionPct} />
      )}
    </div>
  );
};

const OperatorsTable = ({ rows, average }: { rows: readonly OperatorRow[]; average: number | null }) => {
  const t = useTranslations("analytics.operators");
  const columns: Column<OperatorRow>[] = [
    {
      id: "name",
      header: t("name"),
      primary: true,
      cell: (row) => <span className="font-semibold">{row.fullName}</span>,
    },
    {
      id: "leads",
      header: t("leads"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.leads),
    },
    { id: "sold", header: t("sold"), numeric: true, align: "right", cell: (row) => formatNumber(row.sold) },
    {
      id: "conversion",
      header: t("conversion"),
      numeric: true,
      align: "right",
      cell: (row) => (
        <span className="inline-flex items-center gap-2">
          <span className="num font-semibold">{formatPercent(row.conversionPct)}</span>
          <MetricDelta value={versusAverage(row.conversionPct, average)} unit="pp" />
        </span>
      ),
    },
    {
      id: "cancel",
      header: t("cancelRate"),
      numeric: true,
      align: "right",
      cell: (row) => formatPercent(row.cancelRatePct),
    },
  ];
  return <DataTable columns={columns} rows={rows} rowKey={(row) => String(row.id)} />;
};

const ProductsTable = ({ rows }: { rows: readonly ProductRow[] }) => {
  const t = useTranslations("analytics.products");
  const format = useFormat();
  const ranked = rankProducts(rows);

  const columns: Column<ProductRow>[] = [
    {
      id: "name",
      header: t("name"),
      primary: true,
      cell: (row) => (
        <span className="flex items-center gap-2">
          <ProductThumb name={row.name} src={row.image} />
          <span className="font-semibold">{row.name}</span>
          {row.id === ranked.worstId ? (
            <Pill intent="warn" icon={AlertTriangle}>
              {t("mostCancelled")}
            </Pill>
          ) : null}
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
      id: "cancelled",
      header: t("cancelled"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.cancelled),
    },
    {
      id: "rate",
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
      cell: (row) => format.money(row.revenue),
    },
  ];
  return <DataTable columns={columns} rows={ranked.rows} rowKey={(row) => String(row.id)} />;
};
