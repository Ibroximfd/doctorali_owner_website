"use client";

import { PackageX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { formatDecimal, formatNumber, formatPhone } from "@/shared/lib/format";
import { useRegionName } from "@/shared/meta/use-region-name";
import { DataTable } from "@/shared/ui/data-table";
import { Drawer, DrawerSection } from "@/shared/ui/drawer";
import { KvList } from "@/shared/ui/kv-list";
import { MiniStats } from "@/shared/ui/mini-stats";
import { ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useWarehouseDrawer } from "../hooks/use-warehouse-drawer";
import { useStockQuery, useWarehousesQuery } from "../hooks/use-warehouse";
import { useStockColumns } from "./stock-table";
import { StockStatusPill } from "./stock-status";

/** Ombor kartasi (`?warehouse=<id>`): qoldiq, skladchi va shu ombordagi har mahsulot. Faqat ko'rish. */
export const WarehouseDrawer = () => {
  const t = useTranslations("warehouse.drawer");
  const format = useFormat();
  const regionName = useRegionName();
  const { warehouseId, closeWarehouse } = useWarehouseDrawer();
  // Yopilish animatsiyasi davomida oxirgi ombor ko'rinib turadi.
  const [shownId, setShownId] = useState(warehouseId);
  if (warehouseId !== null && warehouseId !== shownId) setShownId(warehouseId);

  const warehouses = useWarehousesQuery().data?.data;
  const warehouse = warehouses?.find((item) => item.id === shownId);
  const stock = useStockQuery(shownId, warehouseId !== null);
  const columns = useStockColumns(false);

  return (
    <Drawer
      open={warehouseId !== null}
      onOpenChange={(open) => {
        if (!open) closeWarehouse();
      }}
      title={warehouse?.name ?? t("title")}
      subtitle={warehouse ? <StockStatusPill status={warehouse.status} /> : undefined}
    >
      {warehouses && !warehouse ? (
        <StateBlock icon={PackageX} title={t("notFoundTitle")} description={t("notFoundDescription")} />
      ) : (
        <div className="flex flex-col gap-4.5">
          {warehouse ? (
            <>
              <MiniStats
                items={[
                  { key: "stock", label: t("stock"), value: formatNumber(warehouse.stockUnits) },
                  {
                    key: "value",
                    label: t("value"),
                    value: format.moneyCompact(warehouse.stockValue),
                    unit: format.currency,
                  },
                  {
                    key: "cover",
                    label: t("cover"),
                    value: warehouse.daysOfCover === null ? "—" : formatDecimal(warehouse.daysOfCover),
                  },
                  {
                    key: "problems",
                    label: t("problems"),
                    value: formatNumber(warehouse.outSkus + warehouse.lowSkus),
                  },
                ]}
              />
              <DrawerSection title={t("details")}>
                <KvList
                  rows={[
                    {
                      key: "keeper",
                      label: t("keeper"),
                      value: warehouse.keeper?.fullName ?? "—",
                      hint: warehouse.keeper?.phone ? formatPhone(warehouse.keeper.phone) : undefined,
                    },
                    {
                      key: "regions",
                      label: t("regions"),
                      value: warehouse.regions.map(regionName).join(", ") || "—",
                    },
                    {
                      key: "movement",
                      label: t("lastMovement"),
                      value: warehouse.lastMovementAt ? format.dateTime(warehouse.lastMovementAt) : "—",
                    },
                  ]}
                />
              </DrawerSection>
            </>
          ) : (
            <ListSkeleton rows={4} />
          )}
          <DrawerSection title={t("products")}>
            <QueryState
              query={stock}
              skeleton={<ListSkeleton rows={5} />}
              isEmpty={({ data }) => data.length === 0}
            >
              {({ data }) => (
                <DataTable columns={columns} rows={data} rowKey={(row) => String(row.productId)} />
              )}
            </QueryState>
          </DrawerSection>
        </div>
      )}
    </Drawer>
  );
};
