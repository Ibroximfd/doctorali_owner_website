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
import { useRegionName } from "@/shared/meta/use-region-name";

import { useFinanceQuery } from "../hooks/use-finance";
import { PENDING_ALERT_PCT, chiefRows, feeDue, lastHandovers, type ChiefRow } from "../model/finance.rules";
import type { Finance, FinanceFilial, Handover } from "../model/finance.schema";
import { RegionsMapCard } from "./regions-map-card";

/**
 * «Moliya» (tuzilma v2 §6, §12.2): pul qancha va qayerda — har filial alohida va umumiy;
 * bosh kuryerlar bilan har filial hisobi, ularning haqi (viloyat narxi bo'yicha), topshiriqlar,
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
            <QueryState
              query={query}
              skeleton={<ListSkeleton rows={4} />}
              isEmpty={({ data }) => data.filials.length === 0}
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
              {({ data }) => (
                <ChiefsTable rows={chiefRows(data.chiefs)} feePaidTracked={data.feePaidTracked} />
              )}
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

/**
 * Bosh kuryer haqi (TZ 32 §R): narx VILOYAT bo'yicha (`address_rates`), har filial — haq serverdan
 * tayyor (panel manzilga bo'lib hisoblamaydi). Narxsiz viloyat — «—» va qizil belgi, haq to'liq
 * emasligi ogohlantiriladi. Eski backend (`address_rates` yo'q) — bitta umumiy narx. To'langan va
 * qarz faqat tizim to'lovni kuzatsa (`fee_paid_tracked`).
 */
const ChiefFee = ({ finance }: { finance: Finance }) => {
  const t = useTranslations("finance.fee");
  const format = useFormat();
  const tracked = finance.feePaidTracked;

  return (
    <div className="flex flex-col gap-4">
      <RatesBlock finance={finance} />
      {finance.totals.missingRate ? (
        <p role="note" className="bg-warn-soft text-warn rounded-xl px-3 py-2 text-xs">
          {t("incompleteNote")}
        </p>
      ) : null}
      {tracked ? null : <p className="text-ink-3 text-xs">{t("notTrackedNote")}</p>}
      <ul className="flex flex-col divide-y">
        {finance.filials.map((row) => {
          const due = tracked ? feeDue(row) : null;
          return (
            <li key={row.id} className="py-2.5">
              <div className="flex items-center gap-2">
                <FilialName code={row.code} name={row.name} />
                {row.missingRate ? (
                  <Pill intent="warn" icon={AlertTriangle} className="ml-auto">
                    {t("incomplete")}
                  </Pill>
                ) : null}
                {/* to'langani kuzatilmaydi yoki noma'lum — holat belgisi yo'q */}
                {due === null ? null : due > 0 ? (
                  <Pill intent="warn" className={row.missingRate ? undefined : "ml-auto"}>
                    {t("due", { value: format.moneyCompact(due) })}
                  </Pill>
                ) : (
                  <Pill intent="good" icon={CheckCircle2} className={row.missingRate ? undefined : "ml-auto"}>
                    {t("paid")}
                  </Pill>
                )}
              </div>
              <KvList
                className="mt-1"
                rows={[
                  {
                    key: "fee",
                    label: t("addresses", { count: formatNumber(row.addresses) }),
                    value: format.money(row.chiefFee),
                  },
                  {
                    key: "paid",
                    label: t("paidLabel"),
                    value: !tracked
                      ? t("notTracked")
                      : row.chiefFeePaid === null
                        ? "—"
                        : format.money(row.chiefFeePaid),
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

/** Joriy narxlar: viloyatlar ro'yxati (yangi) yoki bitta umumiy narx (eski); ikkalasi yo'q — blok yo'q. */
const RatesBlock = ({ finance }: { finance: Finance }) => {
  const t = useTranslations("finance.fee");
  const format = useFormat();
  const regionName = useRegionName();
  const rates = finance.addressRates;

  if (rates !== null && rates.length > 0)
    return (
      <div className="bg-accent-soft rounded-2xl px-4 py-3">
        <div className="text-ink-2 text-xs">{t("ratesTitle")}</div>
        <ul className="mt-1.5 grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {[...rates]
            .sort((a, b) => Number(a.rate !== null) - Number(b.rate !== null))
            .map((row) => (
              <li key={row.region} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">
                  {row.region === "" ? t("unknownRegion") : regionName(row.region)}
                </span>
                {row.rate === null ? (
                  <Pill intent="crit">{t("noRate")}</Pill>
                ) : (
                  <span className="num font-semibold">{format.money(row.rate)}</span>
                )}
              </li>
            ))}
        </ul>
        <div className="text-ink-3 text-2xs mt-1.5">{t("ratesNote")}</div>
      </div>
    );

  if (finance.addressRate === null) return null;
  return (
    <div className="bg-accent-soft rounded-2xl px-4 py-3">
      <div className="text-ink-2 text-xs">{t("rate")}</div>
      <div className="num font-display text-2xl">{format.money(finance.addressRate)}</div>
      <div className="text-ink-3 text-2xs mt-0.5">{t("rateNote")}</div>
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
          {row.status === "confirmed" ? (
            <Pill intent="good" icon={CheckCircle2}>
              {t("status.confirmed")}
            </Pill>
          ) : (
            <Pill intent={row.status === "disputed" ? "crit" : "warn"} icon={AlertTriangle}>
              {t(`status.${row.status}`)}
            </Pill>
          )}
        </li>
      ))}
    </ul>
  );
};

/**
 * Haq katagi: narxsiz viloyat — «—» (0 emas); qisman narxsiz — summa + «to'liq emas» va qaysi
 * viloyatlar tushib qolgani (TZ 32 §R, `missing_rates`).
 */
const ChiefFeeCell = ({ row, feePaidTracked }: { row: ChiefRow; feePaidTracked: boolean }) => {
  const t = useTranslations("finance.fee");
  const format = useFormat();
  const regionName = useRegionName();
  const fee = row.fee === null ? "—" : format.moneyCompact(row.fee);
  const value = feePaidTracked ? (
    <span className="text-ink-2">
      {row.feePaid === null ? "—" : format.moneyCompact(row.feePaid)} / {fee}
    </span>
  ) : (
    fee
  );
  if (!row.missingRate && row.fee !== null) return value;
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      {value}
      <span className="text-warn text-2xs">
        {row.missingRates.length > 0
          ? t("missingRegions", { regions: row.missingRates.map(regionName).join(", ") })
          : t("noRate")}
      </span>
    </span>
  );
};

/** Har bosh kuryer × har filial: yig'ilgan, topshirilgan, kutilayotgan pul, manzil va haq. */
const ChiefsTable = ({ rows, feePaidTracked }: { rows: readonly ChiefRow[]; feePaidTracked: boolean }) => {
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
      header: feePaidTracked ? t("fee") : t("feeTotal"),
      numeric: true,
      align: "right",
      cell: (row) => <ChiefFeeCell row={row} feePaidTracked={feePaidTracked} />,
    },
  ];

  return <DataTable columns={columns} rows={rows} rowKey={(row) => `${row.skladId}-${row.filialId}`} />;
};
