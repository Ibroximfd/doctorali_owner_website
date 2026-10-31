"use client";

import { useTranslations } from "next-intl";

import { STATUS_COLORS } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ChartCard } from "@/shared/ui/chart-card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Grid, span } from "@/shared/ui/grid";
import { KvList } from "@/shared/ui/kv-list";
import { Segmented } from "@/shared/ui/segmented";
import { StackedBar } from "@/shared/ui/stacked-bar";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import {
  BlockSkeleton,
  ChartSkeleton,
  EmptyState,
  NoResults,
  QueryState,
  StatRowSkeleton,
  TableSkeleton,
} from "@/shared/ui/states";

import {
  useAppOperatorsQuery,
  useAppOrdersQuery,
  useAppUsersQuery,
  useOperatorView,
} from "../hooks/use-mobile-app";
import { OPERATOR_SORTS, operatorRows, orderedRate } from "../model/mobile-app.rules";
import {
  APP_ORDER_STATUSES,
  type AppFilialOrders,
  type AppOperator,
  type AppOrders,
  type AppUsers,
} from "../model/mobile-app.schema";

type Granularity = "hour" | "day" | "week" | "month";

/** Holat ranglari — buyurtma holati tokenlari (rang yolg'iz emas: legendada nomi va soni). */
const STATUS_BG: Record<(typeof APP_ORDER_STATUSES)[number], string> = {
  pending: "bg-order-pending",
  confirmed: "bg-order-confirmed",
  in_transit: "bg-order-shipping",
  delivered: "bg-order-delivered",
  cancelled: "bg-order-cancelled",
};

/**
 * «Ilova»: ilovadan tushgan zakazlar va ularning holati (filiallar kesimida), foydalanuvchilar
 * (jami, DAU, MAU) va operatorlar ilovaga nechta odam olib kirgani. Zakaz va pul — Moliya va
 * Analitikadagi «Ilovadan» filtri bilan bir xil raqam.
 */
export const MobileAppScreen = () => {
  const t = useTranslations("app");
  const orders = useAppOrdersQuery();
  const users = useAppUsersQuery();

  return (
    <>
      <section aria-labelledby="app-orders">
        <h2 id="app-orders" className="font-display text-display mb-3">
          {t("orders.title")}
        </h2>
        <QueryState query={orders} skeleton={<StatRowSkeleton count={4} />}>
          {({ data }) => <OrderTotals orders={data} />}
        </QueryState>
        <Grid>
          <Card className={span.full}>
            <CardHeader title={t("orders.statusesTitle")} description={t("orders.statusesDescription")} />
            <CardBody>
              <QueryState
                query={orders}
                skeleton={<BlockSkeleton className="h-20" />}
                isEmpty={({ data }) => data.total === 0}
              >
                {({ data }) => <StatusBar orders={data} />}
              </QueryState>
            </CardBody>
          </Card>
          <div className={span.c7}>
            <QueryState
              query={orders}
              skeleton={<ChartSkeleton />}
              isEmpty={({ data }) => data.trend.labels.length === 0}
            >
              {({ data, period }) => <OrdersTrend orders={data} granularity={period.granularity} />}
            </QueryState>
          </div>
          <Card className={span.c5}>
            <CardHeader title={t("orders.filialsTitle")} description={t("orders.filialsDescription")} />
            <CardBody flush>
              <QueryState query={orders} skeleton={<TableSkeleton rows={3} className="px-5" />}>
                {({ data }) => <FilialsTable rows={data.filials} />}
              </QueryState>
            </CardBody>
          </Card>
        </Grid>
      </section>

      <section aria-labelledby="app-users" className="mt-8">
        <h2 id="app-users" className="font-display text-display mb-3">
          {t("users.title")}
        </h2>
        <QueryState query={users} skeleton={<StatRowSkeleton count={4} />}>
          {({ data }) => <UserTotals users={data} />}
        </QueryState>
        {/* yangi foydalanuvchilar dinamikasi (`users.trend`, B-20) + faollik ulushlari; DAU/MAU
            kunlik qatori backendda yo'q — ular faqat joriy ko'rsatkich */}
        <QueryState query={users} skeleton={<ChartSkeleton />}>
          {({ data, period }) => (
            <Grid className="mt-4">
              {data.trend.labels.length === 0 ? null : (
                <div className={span.c7}>
                  <NewUsersChart users={data} granularity={period.granularity} />
                </div>
              )}
              <ActivityCard users={data} className={data.trend.labels.length === 0 ? span.full : span.c5} />
            </Grid>
          )}
        </QueryState>
      </section>

      <section className="mt-8">
        <OperatorsCard />
      </section>
    </>
  );
};

const OrderTotals = ({ orders }: { orders: AppOrders }) => {
  const t = useTranslations("app.orders");
  const format = useFormat();
  const share = (value: number) => formatPercent(orders.total > 0 ? (value / orders.total) * 100 : 0);
  return (
    <StatRow columns={4}>
      <StatTile label={t("total")} value={formatNumber(orders.total)} />
      <StatTile
        label={t("delivered")}
        value={formatNumber(orders.statuses.delivered)}
        note={t("share", { value: share(orders.statuses.delivered) })}
      />
      <StatTile
        label={t("revenue")}
        value={orders.revenue === null ? "—" : format.moneyCompact(orders.revenue)}
        unit={orders.revenue === null ? undefined : format.currency}
      />
      <StatTile
        label={t("cancelled")}
        value={formatNumber(orders.statuses.cancelled)}
        note={t("share", { value: share(orders.statuses.cancelled) })}
      />
    </StatRow>
  );
};

const StatusBar = ({ orders }: { orders: AppOrders }) => {
  const t = useTranslations("app.orders.statuses");
  return (
    <StackedBar
      ariaLabel={t("label")}
      legend="block"
      items={APP_ORDER_STATUSES.map((status) => ({
        key: status,
        label: t(status),
        value: orders.statuses[status === "in_transit" ? "inTransit" : status],
        colorClassName: STATUS_BG[status],
      }))}
    />
  );
};

const OrdersTrend = ({ orders, granularity }: { orders: AppOrders; granularity: Granularity }) => {
  const t = useTranslations("app.orders");
  const format = useFormat();
  return (
    <ChartCard
      title={t("trendTitle")}
      description={t("trendDescription")}
      kind="trend"
      columnLabel={t("period")}
      formatValue={formatNumber}
      data={{
        labels: orders.trend.labels.map((label) => format.bucket(label, granularity)),
        series: [
          { key: "total", name: t("total"), color: STATUS_COLORS.confirmed, values: orders.trend.orders },
          {
            key: "delivered",
            name: t("delivered"),
            color: STATUS_COLORS.delivered,
            values: orders.trend.delivered,
          },
        ],
      }}
    />
  );
};

const FilialsTable = ({ rows }: { rows: readonly AppFilialOrders[] }) => {
  const t = useTranslations("app.orders");
  const format = useFormat();
  const columns: Column<AppFilialOrders>[] = [
    {
      id: "filial",
      header: t("filial"),
      primary: true,
      cell: (row) => (
        <span className="flex items-center gap-2">
          <span className="bg-surface-3 text-2xs rounded-sm px-1.5 py-0.5 font-bold">{row.code}</span>
          <span className="font-semibold">{row.name}</span>
        </span>
      ),
    },
    {
      id: "total",
      header: t("received"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.total),
    },
    {
      id: "delivered",
      header: t("delivered"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.delivered),
    },
    {
      id: "revenue",
      header: t("revenue"),
      numeric: true,
      align: "right",
      cell: (row) => (row.revenue === null ? "—" : format.moneyCompact(row.revenue)),
    },
  ];
  return <DataTable columns={columns} rows={rows} rowKey={(row) => String(row.id)} />;
};

const UserTotals = ({ users }: { users: AppUsers }) => {
  const t = useTranslations("app.users");
  return (
    <StatRow columns={4}>
      <StatTile label={t("total")} value={formatNumber(users.usersTotal)} note={t("totalNote")} />
      <StatTile label={t("new")} value={formatNumber(users.newUsers)} note={t("newNote")} />
      <StatTile label={t("dau")} value={formatNumber(users.dau)} note={t("dauNote")} />
      <StatTile label={t("mau")} value={formatNumber(users.mau)} note={t("mauNote")} />
    </StatRow>
  );
};

/** Faollik ulushlari: oylik aktivlar jami ichida, kunlik aktivlar oylik ichida, yangilar ulushi. */
const ActivityCard = ({ users, className }: { users: AppUsers; className?: string }) => {
  const t = useTranslations("app.users.activity");
  const share = (part: number, whole: number) => (whole > 0 ? formatPercent((part / whole) * 100) : "—");
  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <KvList
          rows={[
            { key: "mau", label: t("mauShare"), value: share(users.mau, users.usersTotal) },
            { key: "dau", label: t("stickiness"), value: share(users.dau, users.mau) },
            { key: "new", label: t("newShare"), value: share(users.newUsers, users.usersTotal) },
          ]}
        />
      </CardBody>
    </Card>
  );
};

/** Yangi foydalanuvchilar — davr bo'yicha (`users.trend`). */
const NewUsersChart = ({ users, granularity }: { users: AppUsers; granularity: Granularity }) => {
  const t = useTranslations("app.users");
  const format = useFormat();
  return (
    <ChartCard
      title={t("chartTitle")}
      description={t("chartDescription")}
      kind="trend"
      columnLabel={t("period")}
      formatValue={formatNumber}
      data={{
        labels: users.trend.labels.map((label) => format.bucket(label, granularity)),
        series: [
          {
            key: "new",
            name: t("new"),
            color: "var(--series-1)",
            values: users.trend.new,
            area: true,
          },
        ],
      }}
    />
  );
};

const OperatorsCard = () => {
  const t = useTranslations("app.operators");
  const query = useAppOperatorsQuery();
  const { filialId, sort, setFilial, setSort } = useOperatorView();
  return (
    <Card>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={6} className="px-5" />}
          isEmpty={({ data }) => data.length === 0}
          empty={<EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />}
        >
          {({ data }) => {
            const filials = [...new Map(data.map((row) => [row.filialId, row])).values()];
            const rows = operatorRows(data, filialId, sort);
            return (
              <>
                <div className="flex flex-wrap gap-2.5 px-4 pb-2 md:px-5.5">
                  <Segmented
                    ariaLabel={t("filial")}
                    value={filialId === null ? "all" : String(filialId)}
                    onChange={(value) => setFilial(value === "all" ? null : Number(value))}
                    options={[
                      { value: "all", label: t("all") },
                      ...filials.map((row) => ({ value: String(row.filialId), label: row.filialCode })),
                    ]}
                  />
                  <Segmented
                    ariaLabel={t("sort")}
                    value={sort}
                    onChange={setSort}
                    options={OPERATOR_SORTS.map((value) => ({ value, label: t(`sorts.${value}`) }))}
                  />
                </div>
                {rows.length === 0 ? (
                  <NoResults onClear={() => setFilial(null)} />
                ) : (
                  <OperatorsTable rows={rows} />
                )}
              </>
            );
          }}
        </QueryState>
      </CardBody>
    </Card>
  );
};

const OperatorsTable = ({ rows }: { rows: readonly AppOperator[] }) => {
  const t = useTranslations("app.operators");
  const columns: Column<AppOperator>[] = [
    {
      id: "name",
      header: t("name"),
      primary: true,
      cell: (row) => <span className="font-semibold">{row.fullName}</span>,
    },
    {
      id: "filial",
      header: t("filial"),
      cell: (row) => (
        <span>
          <span className="bg-surface-3 text-2xs rounded-sm px-1.5 py-0.5 font-bold">{row.filialCode}</span>{" "}
          {row.filialName}
        </span>
      ),
    },
    {
      id: "invited",
      header: t("invited"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.invited),
    },
    {
      id: "ordered",
      header: t("ordered"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.ordered),
    },
    {
      id: "rate",
      header: t("rate"),
      numeric: true,
      align: "right",
      cell: (row) => formatPercent(orderedRate(row)),
    },
  ];
  return <DataTable columns={columns} rows={rows} rowKey={(row) => String(row.id)} />;
};
