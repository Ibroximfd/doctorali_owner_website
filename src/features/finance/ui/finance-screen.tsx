"use client";

import { AlertTriangle, CheckCircle2, Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { MONEY_LOCATION_BG } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { useOrderSource } from "@/shared/hooks/use-order-source";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Grid, span } from "@/shared/ui/grid";
import { KvList } from "@/shared/ui/kv-list";
import { Pill } from "@/shared/ui/pill";
import { StackedBar } from "@/shared/ui/stacked-bar";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { ListSkeleton, QueryState, StatRowSkeleton, TableSkeleton } from "@/shared/ui/states";
import { SourcePendingState } from "@/shared/ui/states/states";

import { useFinanceQuery } from "../hooks/use-finance";
import { PENDING_ALERT_PCT, chiefRows, feeDue, lastHandovers, type ChiefRow } from "../model/finance.rules";
import type { Finance, FinanceFilial, Handover } from "../model/finance.schema";
import { RegionsMapCard } from "./regions-map-card";

/**
 * «Moliya» (tuzilma v2 §6, §12.2): pul qancha va qayerda — har filial alohida va umumiy;
 * bosh kuryerlar bilan har filial hisobi, ularning haqi (manzil × bitta narx), topshiriqlar,
 * viloyatlar xaritasi.
 */
export const FinanceScreen = () => {
  const t = useTranslations("finance");
  const query = useFinanceQuery();

  return (
    <>
      <QueryState query={query} skeleton={<StatRowSkeleton count={4} />}>
        {({ data }) => <MoneyKpis finance={data} />}
      </QueryState>

      <Grid>
        <Card className={span.c7}>
          <CardHeader title={t("filials.title")} description={t("filials.description")} />
          <CardBody flush>
            <QueryState query={query} skeleton={<TableSkeleton rows={3} className="px-5" />}>
              {({ data }) => <FilialsMoneyTable rows={data.filials} />}
            </QueryState>
          </CardBody>
        </Card>

        <Card className={span.c5}>
          <CardHeader title={t("fee.title")} description={t("fee.description")} />
          <CardBody>
            {/* manzil narxi va haq finance/v2 jonli javobida yo'q */}
            <QueryState
              query={query}
              skeleton={<ListSkeleton rows={4} />}
              isEmpty={({ data }) => data.addressRate === 0}
              empty={<SourcePendingState />}
            >
              {({ data }) => <ChiefFee finance={data} />}
            </QueryState>
          </CardBody>
        </Card>

        <RegionsMapCard className={span.c7} />

        <Card className={span.c5}>
          <CardHeader title={t("handovers.title")} description={t("handovers.description")} />
          <CardBody>
            <QueryState
              query={query}
              skeleton={<ListSkeleton rows={6} />}
              isEmpty={({ data }) => data.handovers.length === 0}
            >
              {({ data }) => <HandoversList rows={data.handovers} />}
            </QueryState>
          </CardBody>
        </Card>

        <Card className={span.full}>
          <CardHeader title={t("chiefs.title")} description={t("chiefs.description")} />
          <CardBody flush>
            <QueryState query={query} skeleton={<TableSkeleton rows={6} className="px-5" />}>
              {({ data }) => <ChiefsTable rows={chiefRows(data.chiefs)} />}
            </QueryState>
          </CardBody>
        </Card>
      </Grid>
    </>
  );
};

const MoneyKpis = ({ finance }: { finance: Finance }) => {
  const t = useTranslations("finance.kpis");
  const format = useFormat();
  const { totals } = finance;
  const [source] = useOrderSource();
  // pul zanjiri manbaga bo'linmaydi (backend B-12) — filtr yoqilganda ulush emas, shu izoh
  const share = (value: number) =>
    source === "all"
      ? t("share", { value: formatPercent(totals.revenue > 0 ? (value / totals.revenue) * 100 : 0) })
      : t("chainAllSources");

  return (
    <StatRow columns={4}>
      <StatTile
        label={t("revenue")}
        value={format.moneyCompact(totals.revenue)}
        unit={format.currency}
        note={t("addresses", { count: formatNumber(totals.addresses) })}
      />
      <StatTile
        label={t("handed")}
        value={format.moneyCompact(totals.handed)}
        unit={format.currency}
        note={share(totals.handed)}
      />
      <StatTile
        label={t("atChiefs")}
        value={format.moneyCompact(totals.atChiefs)}
        unit={format.currency}
        note={share(totals.atChiefs)}
      />
      <StatTile
        label={t("atCouriers")}
        value={format.moneyCompact(totals.atCouriers)}
        unit={format.currency}
        note={share(totals.atCouriers)}
      />
    </StatRow>
  );
};

const FilialName = ({ code, name, isMain }: { code: string; name: string; isMain?: boolean }) => {
  const t = useTranslations("finance");
  return (
    <span className="flex items-center gap-2">
      <span className="bg-surface-3 text-2xs rounded-sm px-1.5 py-0.5 font-bold">{code}</span>
      <span className="font-semibold">{name}</span>
      {isMain ? <Star aria-label={t("main")} className="text-warn size-3.5" /> : null}
    </span>
  );
};

/** Har filial puli: jami va uning qayerdaligi (bitta chiziqda uch bo'lak). */
const FilialsMoneyTable = ({ rows }: { rows: readonly FinanceFilial[] }) => {
  const t = useTranslations("finance.filials");
  const tStep = useTranslations("finance.kpis");
  const format = useFormat();

  const columns: Column<FinanceFilial>[] = [
    {
      id: "filial",
      header: t("filial"),
      primary: true,
      cell: (row) => <FilialName code={row.code} name={row.name} isMain={row.isMain} />,
    },
    {
      id: "revenue",
      header: t("revenue"),
      numeric: true,
      align: "right",
      cell: (row) => format.money(row.revenue),
    },
    {
      id: "where",
      header: t("where"),
      cell: (row) => (
        <StackedBar
          className="min-w-44"
          ariaLabel={t("whereLabel", { name: row.name })}
          format={format.moneyCompact}
          legend="column"
          items={(["handed", "atChiefs", "atCouriers"] as const).map((step) => ({
            key: step,
            label: tStep(step),
            value: row[step],
            colorClassName: MONEY_LOCATION_BG[step],
          }))}
        />
      ),
    },
  ];

  return <DataTable columns={columns} rows={rows} rowKey={(row) => String(row.id)} />;
};

/** Bosh kuryer haqi: bitta narx, har filial — manzil soni × narx, to'langan va qarz. */
const ChiefFee = ({ finance }: { finance: Finance }) => {
  const t = useTranslations("finance.fee");
  const format = useFormat();

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-accent-soft rounded-2xl px-4 py-3">
        <div className="text-ink-2 text-xs">{t("rate")}</div>
        <div className="num font-display text-2xl">{format.money(finance.addressRate)}</div>
        <div className="text-ink-3 text-2xs mt-0.5">{t("rateNote")}</div>
      </div>
      <ul className="flex flex-col divide-y">
        {finance.filials.map((row) => {
          const due = feeDue(row);
          return (
            <li key={row.id} className="py-2.5">
              <div className="flex items-center gap-2">
                <FilialName code={row.code} name={row.name} />
                {/* to'langani noma'lum (backend bermaydi) — holat belgisi yo'q */}
                {due === null ? null : due > 0 ? (
                  <Pill intent="warn" className="ml-auto">
                    {t("due", { value: format.moneyCompact(due) })}
                  </Pill>
                ) : (
                  <Pill intent="good" icon={CheckCircle2} className="ml-auto">
                    {t("paid")}
                  </Pill>
                )}
              </div>
              <KvList
                className="mt-1"
                rows={[
                  {
                    key: "fee",
                    label: t("formula", { count: formatNumber(row.addresses) }),
                    value: format.money(row.chiefFee),
                  },
                  {
                    key: "paid",
                    label: t("paidLabel"),
                    value: row.chiefFeePaid === null ? "—" : format.money(row.chiefFeePaid),
                  },
                ]}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const HandoversList = ({ rows }: { rows: readonly Handover[] }) => {
  const t = useTranslations("finance.handovers");
  const format = useFormat();
  return (
    <ul className="flex flex-col divide-y">
      {lastHandovers(rows).map((row) => (
        <li key={row.id} className="flex items-center gap-3 py-2.5 text-sm">
          <span className="num text-ink-3 shrink-0 text-xs whitespace-nowrap">{format.date(row.date)}</span>
          <span className="min-w-0 flex-1 truncate">
            {t("route", { chief: row.chiefName, filial: row.filialCode })}
          </span>
          <span className="num shrink-0 font-semibold">{format.moneyCompact(row.amount)}</span>
          {row.onTime ? (
            <span className="sr-only">{t("onTime")}</span>
          ) : (
            <Pill intent="warn" icon={AlertTriangle}>
              {t("late")}
            </Pill>
          )}
        </li>
      ))}
    </ul>
  );
};

/** Har bosh kuryer × har filial: yig'ilgan, topshirilgan, kutilayotgan pul, manzil va haq. */
const ChiefsTable = ({ rows }: { rows: readonly ChiefRow[] }) => {
  const t = useTranslations("finance.chiefs");
  const format = useFormat();

  const columns: Column<ChiefRow>[] = [
    {
      id: "chief",
      header: t("chief"),
      primary: true,
      cell: (row) => (
        <span>
          <span className="font-semibold">{row.chiefName}</span>
          {row.skladName ? (
            <span className="text-ink-3 ml-1.5 text-xs">{t("sklad", { name: row.skladName })}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: "filial",
      header: t("filial"),
      cell: (row) => (
        <span className="bg-surface-3 text-2xs rounded-sm px-1.5 py-0.5 font-bold">{row.filialCode}</span>
      ),
    },
    {
      id: "addresses",
      header: t("addresses"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.addresses),
    },
    {
      id: "collected",
      header: t("collected"),
      numeric: true,
      align: "right",
      cell: (row) => format.money(row.collected),
    },
    {
      id: "handed",
      header: t("handed"),
      numeric: true,
      align: "right",
      cell: (row) => format.money(row.handed),
    },
    {
      id: "pending",
      header: t("pending"),
      numeric: true,
      align: "right",
      cell: (row) =>
        row.pendingPct > PENDING_ALERT_PCT ? (
          <Pill intent="warn" icon={AlertTriangle}>
            {format.money(row.pending)}
          </Pill>
        ) : (
          format.money(row.pending)
        ),
    },
    {
      id: "fee",
      header: t("fee"),
      numeric: true,
      align: "right",
      cell: (row) => (
        <span className="text-ink-2">
          {row.feePaid === null ? "—" : format.moneyCompact(row.feePaid)} / {format.moneyCompact(row.fee)}
        </span>
      ),
    },
  ];

  return <DataTable columns={columns} rows={rows} rowKey={(row) => `${row.skladId}-${row.filialId}`} />;
};
