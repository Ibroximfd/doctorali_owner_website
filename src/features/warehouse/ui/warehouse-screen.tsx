"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Grid, span } from "@/shared/ui/grid";
import { KvList } from "@/shared/ui/kv-list";
import { Pill } from "@/shared/ui/pill";
import { ProductThumb } from "@/shared/ui/product-thumb";
import { Segmented } from "@/shared/ui/segmented";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { ListSkeleton, QueryState, StatRowSkeleton, TableSkeleton } from "@/shared/ui/states";

import {
  useItemImages,
  useLedgerSummaryQuery,
  useOverviewQuery,
  useSelectedSklad,
  useSkladsQuery,
  useStockQuery,
} from "../hooks/use-warehouse";
import { stockRows, type StockRow } from "../model/warehouse.rules";
import type { Sklad, StockCell } from "../model/warehouse.schema";
import { GrantsCard } from "./grants-card";
import { HistoryCard } from "./history-card";
import { SkladMapCard } from "./sklad-map-card";

const ALL = "all";

/**
 * «Sklad» (tuzilma v2 §2.10, §12.5): Owner skladni logist bilan BIR XIL API dan faqat KO'RADI —
 * hamma sklad, hamma mahsulot, qoldiq va harakatlar tarixi (egasining qarori: Owner skladga
 * yozmaydi). Owner faqat mahsulot dopuskini filialga beradi — `owner/structure/sklad-grants/`.
 */
export const WarehouseScreen = () => {
  const t = useTranslations("warehouse");
  const overview = useOverviewQuery();
  const sklads = useSkladsQuery();
  const stock = useStockQuery();

  return (
    <>
      <QueryState query={overview} skeleton={<StatRowSkeleton count={4} />}>
        {(data) => (
          <StatRow columns={4}>
            <StatTile
              label={t("kpis.sklads")}
              value={formatNumber(sklads.data?.length ?? null)}
              note={t("kpis.skladsNote")}
            />
            <StatTile label={t("kpis.stock")} value={formatNumber(data.totals.onHand)} unit={t("kpis.pcs")} />
            <StatTile
              label={t("kpis.couriers")}
              value={formatNumber(data.totals.withCouriers)}
              unit={t("kpis.pcs")}
            />
            <StatTile
              label={t("kpis.low")}
              value={formatNumber(data.totals.lowItems)}
              note={t("kpis.lowNote")}
            />
          </StatRow>
        )}
      </QueryState>

      <Grid>
        <SkladMapCard className={span.full} />

        <Card className={span.full}>
          <CardHeader title={t("stock.title")} description={t("stock.description")} />
          <CardBody flush>
            <QueryState query={stock} skeleton={<TableSkeleton rows={8} className="px-5" />}>
              {(cells) => <StockBlock cells={cells} sklads={sklads.data ?? []} />}
            </QueryState>
          </CardBody>
        </Card>

        <Card className={span.c5}>
          <CardHeader title={t("summary.title")} description={t("summary.description")} />
          <CardBody>
            <LedgerSummary />
          </CardBody>
        </Card>

        <GrantsCard className={span.c7} />

        <HistoryCard className={span.full} />
      </Grid>
    </>
  );
};

const StockBlock = ({ cells, sklads }: { cells: readonly StockCell[]; sklads: readonly Sklad[] }) => {
  const t = useTranslations("warehouse.stock");
  const [selected, setSelected] = useSelectedSklad();
  const sklad = sklads.find((item) => item.id === selected) ?? null;
  const rows = stockRows(cells, sklad?.regions ?? null);
  const imageOf = useItemImages();

  const columns: Column<StockRow>[] = [
    {
      id: "name",
      header: t("product"),
      primary: true,
      cell: (row) => (
        <span className="flex items-center gap-2">
          <ProductThumb name={row.name} src={imageOf(row.itemId)} />
          <span className="font-semibold">{row.name}</span>
        </span>
      ),
    },
    { id: "qty", header: t("qty"), numeric: true, align: "right", cell: (row) => formatNumber(row.qty) },
    {
      id: "courier",
      header: t("courierQty"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.courierQty),
    },
    {
      id: "min",
      header: t("minQty"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.minQty),
    },
    {
      id: "status",
      header: t("status"),
      align: "right",
      cell: (row) =>
        row.isLow ? (
          <Pill intent="crit" icon={AlertTriangle}>
            {t("low")}
          </Pill>
        ) : (
          <Pill intent="good" icon={CheckCircle2}>
            {t("ok")}
          </Pill>
        ),
    },
  ];

  return (
    <div>
      <div className="px-4 pb-2 md:px-5.5">
        <Segmented
          className="max-w-full flex-wrap"
          ariaLabel={t("picker")}
          value={selected === null ? ALL : String(selected)}
          onChange={(value) => void setSelected(value === ALL ? null : Number(value))}
          options={[
            { value: ALL, label: t("all") },
            ...sklads.map((item) => ({ value: String(item.id), label: item.name })),
          ]}
        />
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(row) => String(row.itemId)} />
    </div>
  );
};

/** Davr bo'yicha harakatlar yig'indisi (`ledger/summary/`): kirim, kuryerga berish, sotuv va h.k. */
const LedgerSummary = () => {
  const t = useTranslations("warehouse");
  const query = useLedgerSummaryQuery();
  const label = (key: string) => (t.has(`history.types.${key}`) ? t(`history.types.${key}`) : key);
  const signed = (value: number) =>
    `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatNumber(Math.abs(value))}`;
  return (
    <QueryState
      query={query}
      skeleton={<ListSkeleton rows={6} />}
      isEmpty={(data) => Object.keys(data).length === 0}
    >
      {(data) => (
        <KvList
          rows={Object.entries(data)
            .filter(([key]) => t.has(`history.types.${key}`))
            .map(([key, value]) => ({ key, label: label(key), value: signed(value) }))}
        />
      )}
    </QueryState>
  );
};
