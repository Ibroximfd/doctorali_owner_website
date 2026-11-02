"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatDecimal, formatNumber, formatPercent } from "@/shared/lib/format";
import { useMetaQuery } from "@/shared/meta/use-meta-query";
import { useRegionName } from "@/shared/meta/use-region-name";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import type { Column } from "@/shared/ui/data-table";
import { Meter } from "@/shared/ui/meter";
import { Pill } from "@/shared/ui/pill";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { BlockSkeleton, QueryState, StatRowSkeleton, TableSkeleton } from "@/shared/ui/states";

import {
  useCourierRatings,
  useLogistRatings,
  useOperatorRatings,
  useRatingsView,
} from "../hooks/use-ratings";
import {
  courierRegions,
  filterCouriers,
  filterPeople,
  metricTitle,
  sortByScore,
  starShare,
} from "../model/ratings.rules";
import {
  STARS,
  type CourierRow,
  type CouriersData,
  type Formula,
  type LogistRow,
  type LogistsData,
  type OperatorRow,
  type OperatorsData,
} from "../model/ratings.schema";
import { FormulaCard } from "./formula-card";
import { RatingFilters } from "./rating-filters";
import { RatingList } from "./rating-list";

const PanelSkeleton = () => (
  <div className="flex flex-col gap-4">
    <StatRowSkeleton count={4} />
    <BlockSkeleton className="h-28" />
    <TableSkeleton rows={8} className="px-5" />
  </div>
);

/** Joy (1, 2, 3 …) — server formulasi tartibida, bahosizlarda yo'q. Filtrdan oldin hisoblanadi. */
const ranksOf = <Row extends { score: number | null }>(sorted: readonly Row[], idOf: (row: Row) => number) =>
  new Map(sorted.flatMap((row, index) => (row.score === null ? [] : [[idOf(row), index + 1] as const])));

const direction = (formula: Formula) => formula.score?.direction ?? "desc";

const useFilialName = () => {
  const filials = useMetaQuery().data?.filials ?? [];
  return (id: number | null) =>
    id === null ? "—" : (filials.find((filial) => filial.id === id)?.name ?? "—");
};

const SummaryNote = () => {
  const t = useTranslations("ratings.summary");
  return <p className="text-ink-3 -mt-2 mb-4 text-xs">{t("note")}</p>;
};

/* ---------------- kuryerlar ---------------- */

export const CouriersPanel = () => {
  const query = useCourierRatings();
  return (
    <QueryState query={query} skeleton={<PanelSkeleton />}>
      {(envelope) => <CouriersBody data={envelope.data} />}
    </QueryState>
  );
};

const CouriersBody = ({ data }: { data: CouriersData }) => {
  const t = useTranslations("ratings");
  const regionName = useRegionName();
  const { filters } = useRatingsView();
  const { formula, summary } = data;
  const sorted = sortByScore(data.rows, direction(formula));
  const ranks = ranksOf(sorted, (row) => row.courier.id);
  const rows = filterCouriers(sorted, filters);
  const title = (key: string, fallback: string) => metricTitle(formula, key, t(`columns.${fallback}`));

  const columns: Column<CourierRow>[] = [
    { id: "rank", header: t("columns.rank"), numeric: true, cell: (row) => ranks.get(row.courier.id) ?? "—" },
    {
      id: "name",
      header: t("columns.courier"),
      primary: true,
      cell: (row) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold">{row.courier.name}</span>
          {row.courier.isActive ? null : <Pill intent="neutral">{t("columns.inactive")}</Pill>}
        </span>
      ),
    },
    {
      id: "region",
      header: t("columns.region"),
      cell: (row) => (row.courier.region ? regionName(row.courier.region) : "—"),
    },
    {
      id: "score",
      header: title("score", "score.couriers"),
      numeric: true,
      align: "right",
      cell: (row) => <span className="font-semibold">{formatDecimal(row.score, 2)}</span>,
    },
    {
      id: "avg",
      header: title("rating_avg", "ratingAvg"),
      numeric: true,
      align: "right",
      cell: (row) =>
        row.ratingAvg === null ? (
          "—"
        ) : (
          <span className="inline-flex items-center gap-1">
            <Star aria-hidden className="fill-series-4 text-series-4 size-3.5" />
            {formatDecimal(row.ratingAvg)}
          </span>
        ),
    },
    {
      id: "count",
      header: title("ratings_count", "ratingsCount"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.ratingsCount),
    },
    {
      id: "delivered",
      header: title("delivered_orders", "deliveredOrders"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.deliveredOrders),
    },
    {
      id: "share",
      header: title("rated_share", "ratedShare"),
      numeric: true,
      align: "right",
      cell: (row) => formatPercent(row.ratedShare),
    },
  ];

  return (
    <>
      <StatRow columns={4}>
        <StatTile
          label={t("summary.couriers.avg")}
          value={formatDecimal(summary.avg, 2)}
          unit={t("summary.outOf5")}
        />
        <StatTile label={t("summary.couriers.count")} value={formatNumber(summary.count)} />
        <StatTile label={t("summary.couriers.withComment")} value={formatNumber(summary.withComment)} />
        <StatTile
          label={t("summary.couriers.lowCount")}
          value={formatNumber(summary.lowCount)}
          note={t("summary.couriers.lowNote")}
        />
      </StatRow>
      <SummaryNote />
      <div className="grid gap-4 lg:grid-cols-2">
        <Distribution distribution={summary.distribution} couriers={summary.couriers} />
        <FormulaCard formula={formula} />
      </div>
      <div className="mt-4">
        <RatingList
          title={t("list.couriers")}
          total={data.rows.length}
          rows={rows}
          columns={columns}
          rowKey={(row) => String(row.courier.id)}
          emptyTitle={t("empty.couriers.title")}
          emptyDescription={t("empty.couriers.description")}
          filters={<RatingFilters regions={courierRegions(data.rows)} />}
        />
      </div>
    </>
  );
};

/** Baholar taqsimoti 5 → 1 yulduz; baho bo'lmasa chiziq chizilmaydi (0% emas, «—»). */
const Distribution = ({
  distribution,
  couriers,
}: {
  distribution: Readonly<Record<string, number>>;
  couriers: number | null;
}) => {
  const t = useTranslations("ratings.summary.couriers");
  return (
    <Card>
      <CardHeader
        title={t("distribution")}
        description={t("couriersNote", { count: formatNumber(couriers) })}
      />
      <CardBody>
        <ul className="flex flex-col gap-2.5">
          {STARS.map((star) => {
            const share = starShare(distribution, star);
            return (
              <li key={star} className="flex items-center gap-3 text-sm">
                <span className="num inline-flex w-8 items-center gap-1 text-xs font-semibold">
                  {star}
                  <Star aria-hidden className="fill-series-4 text-series-4 size-3" />
                </span>
                {share === null ? (
                  <span className="text-ink-3 flex-1 text-xs">—</span>
                ) : (
                  <Meter
                    className="flex-1"
                    value={share}
                    tone={Number(star) <= 2 ? "crit" : "accent"}
                    ariaLabel={t("starLabel", { star })}
                  />
                )}
                <span className="num text-ink-2 w-20 text-right text-xs">
                  {formatNumber(distribution[star] ?? 0)} · {formatPercent(share, 0)}
                </span>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
};

/* ---------------- operatorlar ---------------- */

export const OperatorsPanel = () => {
  const query = useOperatorRatings();
  return (
    <QueryState query={query} skeleton={<PanelSkeleton />}>
      {(envelope) => <OperatorsBody data={envelope.data} />}
    </QueryState>
  );
};

const OperatorsBody = ({ data }: { data: OperatorsData }) => {
  const t = useTranslations("ratings");
  const format = useFormat();
  const filialName = useFilialName();
  const { filters } = useRatingsView();
  const { formula, summary } = data;
  const sorted = sortByScore(data.rows, direction(formula));
  const ranks = ranksOf(sorted, (row) => row.operator.id);
  const rows = filterPeople(sorted, (row) => row.operator.name, filters);
  const title = (key: string, fallback: string) => metricTitle(formula, key, t(`columns.${fallback}`));

  const columns: Column<OperatorRow>[] = [
    {
      id: "rank",
      header: t("columns.rank"),
      numeric: true,
      cell: (row) => ranks.get(row.operator.id) ?? "—",
    },
    {
      id: "name",
      header: t("columns.operator"),
      primary: true,
      cell: (row) => <span className="font-semibold">{row.operator.name}</span>,
    },
    { id: "filial", header: t("columns.filial"), cell: (row) => filialName(row.operator.filialId) },
    {
      id: "score",
      header: title("score", "score.operators"),
      numeric: true,
      align: "right",
      cell: (row) => <span className="font-semibold">{formatPercent(row.score)}</span>,
    },
    {
      id: "total",
      header: title("orders_total", "ordersTotal"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.ordersTotal),
    },
    {
      id: "delivered",
      header: title("orders_delivered", "ordersDelivered"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.ordersDelivered),
    },
    {
      id: "cancelled",
      header: title("orders_cancelled", "ordersCancelled"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.ordersCancelled),
    },
    {
      id: "revenue",
      header: title("revenue", "revenue"),
      numeric: true,
      align: "right",
      cell: (row) => format.money(row.revenue),
    },
  ];

  return (
    <>
      <StatRow columns={4}>
        <StatTile label={t("summary.operators.operators")} value={formatNumber(summary.operators)} />
        <StatTile label={t("summary.operators.ordersTotal")} value={formatNumber(summary.ordersTotal)} />
        <StatTile
          label={t("summary.operators.ordersDelivered")}
          value={formatNumber(summary.ordersDelivered)}
        />
        <StatTile label={t("summary.operators.avgScore")} value={formatPercent(summary.avgScore)} />
      </StatRow>
      <SummaryNote />
      <FormulaCard formula={formula} />
      <div className="mt-4">
        <RatingList
          title={t("list.operators")}
          total={data.rows.length}
          rows={rows}
          columns={columns}
          rowKey={(row) => String(row.operator.id)}
          emptyTitle={t("empty.operators.title")}
          emptyDescription={t("empty.operators.description")}
          filters={<RatingFilters />}
        />
      </div>
    </>
  );
};

/* ---------------- logistlar ---------------- */

export const LogistsPanel = () => {
  const query = useLogistRatings();
  return (
    <QueryState query={query} skeleton={<PanelSkeleton />}>
      {(envelope) => <LogistsBody data={envelope.data} />}
    </QueryState>
  );
};

const LogistsBody = ({ data }: { data: LogistsData }) => {
  const t = useTranslations("ratings");
  const format = useFormat();
  const filialName = useFilialName();
  const { filters } = useRatingsView();
  const { formula, summary } = data;
  const sorted = sortByScore(data.rows, direction(formula));
  const ranks = ranksOf(sorted, (row) => row.logist.id);
  const rows = filterPeople(sorted, (row) => row.logist.name, filters);
  const title = (key: string, fallback: string) => metricTitle(formula, key, t(`columns.${fallback}`));

  const columns: Column<LogistRow>[] = [
    { id: "rank", header: t("columns.rank"), numeric: true, cell: (row) => ranks.get(row.logist.id) ?? "—" },
    {
      id: "name",
      header: t("columns.logist"),
      primary: true,
      cell: (row) => <span className="font-semibold">{row.logist.name}</span>,
    },
    { id: "filial", header: t("columns.filial"), cell: (row) => filialName(row.logist.filialId) },
    {
      id: "score",
      header: title("score", "score.logists"),
      numeric: true,
      align: "right",
      cell: (row) => <span className="font-semibold">{format.duration(row.score)}</span>,
    },
    {
      id: "finalized",
      header: title("finalized_orders", "finalizedOrders"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.finalizedOrders),
    },
    {
      id: "delivered",
      header: title("delivered_orders", "deliveredOrders"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.deliveredOrders),
    },
    {
      id: "cancelled",
      header: title("cancelled_orders", "cancelledOrders"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.cancelledOrders),
    },
  ];

  return (
    <>
      <StatRow columns={4}>
        <StatTile label={t("summary.logists.logists")} value={formatNumber(summary.logists)} />
        <StatTile
          label={t("summary.logists.finalizedOrders")}
          value={formatNumber(summary.finalizedOrders)}
        />
        <StatTile
          label={t("summary.logists.avgReview")}
          value={format.duration(summary.avgReviewMinutes)}
          note={t("summary.logists.avgReviewNote")}
        />
      </StatRow>
      <SummaryNote />
      <FormulaCard formula={formula} />
      <div className="mt-4">
        <RatingList
          title={t("list.logists")}
          total={data.rows.length}
          rows={rows}
          columns={columns}
          rowKey={(row) => String(row.logist.id)}
          emptyTitle={t("empty.logists.title")}
          emptyDescription={t("empty.logists.description")}
          filters={<RatingFilters />}
        />
      </div>
    </>
  );
};
