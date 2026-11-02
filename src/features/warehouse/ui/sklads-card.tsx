"use client";

import { Building2, UserRoundX } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { useRegionName } from "@/shared/meta/use-region-name";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Drawer, DrawerSection } from "@/shared/ui/drawer";
import { KvList } from "@/shared/ui/kv-list";
import { Pill } from "@/shared/ui/pill";
import { ListSkeleton, QueryState, StateBlock, TableSkeleton } from "@/shared/ui/states";

import {
  useOverviewQuery,
  useSkladQuery,
  useSkladsQuery,
  useStockQuery,
  useWarehouseDialogs,
} from "../hooks/use-warehouse";
import { skladSummary } from "../model/warehouse.rules";
import type { Sklad } from "../model/warehouse.schema";

/**
 * Skladlar ro'yxati (TZ 32 §S-3.1): har sklad — viloyatlari, BIRIKTIRILGAN BARCHA bosh kuryerlar
 * (`chiefs[]`), omborlar soni, holati. Qator — detal (`sklads/{id}/`). Owner faqat ko'radi: yaratish
 * va tahrir `warehouse.admin` kaliti bor bosh logistda (logist sayti).
 */
export const SkladsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("warehouse.sklads");
  const query = useSkladsQuery();
  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={4} className="px-5" />}
          isEmpty={(rows) => rows.length === 0}
          empty={<StateBlock icon={Building2} title={t("emptyTitle")} description={t("emptyDescription")} />}
        >
          {(rows) => <SkladsTable rows={rows} />}
        </QueryState>
      </CardBody>
      <SkladDrawer />
    </Card>
  );
};

const ChiefList = ({ sklad }: { sklad: Pick<Sklad, "chiefs"> }) => {
  const t = useTranslations("warehouse.sklads");
  if (sklad.chiefs.length === 0)
    return (
      <Pill intent="warn" icon={UserRoundX}>
        {t("noChief")}
      </Pill>
    );
  return (
    <span className="flex flex-wrap gap-1">
      {sklad.chiefs.map((chief) => (
        <span key={chief.id} className="bg-surface-3 rounded-sm px-1.5 py-0.5 text-xs">
          {chief.fullName}
        </span>
      ))}
    </span>
  );
};

const StatusPill = ({ isActive }: { isActive: boolean }) => {
  const t = useTranslations("warehouse.sklads");
  return <Pill intent={isActive ? "good" : "neutral"}>{t(isActive ? "active" : "closed")}</Pill>;
};

const SkladsTable = ({ rows }: { rows: readonly Sklad[] }) => {
  const t = useTranslations("warehouse.sklads");
  const regionName = useRegionName();
  const { openSklad } = useWarehouseDialogs();

  const columns: Column<Sklad>[] = [
    {
      id: "name",
      header: t("name"),
      primary: true,
      cell: (row) => <span className="font-semibold">{row.name}</span>,
    },
    {
      id: "regions",
      header: t("regions"),
      cell: (row) => <span className="text-ink-2">{row.regions.map(regionName).join(", ") || "—"}</span>,
    },
    { id: "chiefs", header: t("chiefs"), cell: (row) => <ChiefList sklad={row} /> },
    {
      id: "locations",
      header: t("locations"),
      numeric: true,
      align: "right",
      cell: (row) => formatNumber(row.locations),
    },
    {
      id: "status",
      header: t("status"),
      align: "right",
      cell: (row) => <StatusPill isActive={row.isActive} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => String(row.id)}
      onRowClick={(row) => openSklad(row.id)}
      rowLabel={(row) => t("openRow", { name: row.name })}
    />
  );
};

/** Sklad detali (§S-3.2): `404 not_found` — «topilmadi». */
const SkladDrawer = () => {
  const t = useTranslations("warehouse.sklads");
  const { skladInfoId, closeSklad } = useWarehouseDialogs();
  const query = useSkladQuery(skladInfoId);
  return (
    <Drawer
      open={skladInfoId !== null}
      onOpenChange={(open) => (open ? undefined : closeSklad())}
      title={query.data?.name ?? t("detailTitle")}
    >
      <QueryState query={query} skeleton={<ListSkeleton rows={5} />}>
        {(sklad) => <SkladDetail sklad={sklad} />}
      </QueryState>
    </Drawer>
  );
};

const SkladDetail = ({ sklad }: { sklad: Sklad }) => {
  const t = useTranslations("warehouse.sklads");
  const tMap = useTranslations("warehouse.map");
  const format = useFormat();
  const regionName = useRegionName();
  const summary = skladSummary(sklad, useOverviewQuery().data, useStockQuery().data);
  return (
    <>
      <DrawerSection title={t("about")}>
        <KvList
          rows={[
            { key: "status", label: t("status"), value: <StatusPill isActive={sklad.isActive} /> },
            { key: "locations", label: t("locations"), value: formatNumber(sklad.locations) },
            ...(sklad.createdAt
              ? [{ key: "created", label: t("created"), value: format.date(sklad.createdAt) }]
              : []),
            {
              key: "stock",
              label: tMap("stock"),
              value: tMap("pcs", { count: formatNumber(summary.onHand) }),
            },
            {
              key: "couriers",
              label: tMap("couriers"),
              value: tMap("pcs", { count: formatNumber(summary.withCouriers) }),
            },
          ]}
        />
      </DrawerSection>
      <DrawerSection title={t("regions")}>
        {sklad.regions.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {sklad.regions.map((code) => (
              <li key={code} className="bg-surface-3 rounded-sm px-2 py-0.5 text-xs">
                {regionName(code)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-3 text-sm">—</p>
        )}
        {sklad.isActive ? null : <p className="text-ink-3 mt-2 text-xs">{t("closedNote")}</p>}
      </DrawerSection>
      <DrawerSection title={t("chiefs")}>
        <ChiefList sklad={sklad} />
        {sklad.chiefs.length === 0 ? <p className="text-ink-3 mt-2 text-xs">{t("noChiefNote")}</p> : null}
      </DrawerSection>
      <p className="text-ink-3 text-xs">{t("readOnlyNote")}</p>
    </>
  );
};
