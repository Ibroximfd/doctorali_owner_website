"use client";

import { OctagonAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { routes } from "@/shared/config/routes";
import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { CardLink } from "@/shared/ui/card-link";
import { MiniStats } from "@/shared/ui/mini-stats";
import { Pill } from "@/shared/ui/pill";
import { BlockSkeleton, ListSkeleton, QueryState } from "@/shared/ui/states";

import { useClinicWarehouseQuery } from "../hooks/use-clinic";

type StockItem = { key: string; product: string; note: string; pill: ReactNode };

const StockList = ({ title, items }: { title: string; items: readonly StockItem[] }) => (
  <section className="mt-3.5">
    <h3 className="text-2xs text-ink-3 mb-1 font-semibold">{title}</h3>
    <ul>
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-3 border-b py-2 last:border-b-0">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{item.product}</div>
            <div className="text-ink-3 truncate text-xs">{item.note}</div>
          </div>
          {item.pill}
        </li>
      ))}
    </ul>
  </section>
);

/** Klinika do'koni ombori: qoldiq qiymati va e'tibor talab qiladigan mahsulotlar (tugagan / kam qolgan). */
export const WarehouseCard = ({ className }: { className?: string }) => {
  const t = useTranslations("clinic.warehouse");
  const format = useFormat();
  const query = useClinicWarehouseQuery();

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={t("description")}
        action={<CardLink href={routes.products}>{t("link")}</CardLink>}
      />
      <CardBody>
        <QueryState
          query={query}
          skeleton={
            <div className="flex flex-col gap-4">
              <BlockSkeleton className="h-16" />
              <ListSkeleton rows={4} />
            </div>
          }
        >
          {({ data: warehouse }) => (
            <>
              <MiniStats
                items={[
                  {
                    key: "value",
                    label: t("stockValue"),
                    value: format.moneyCompact(warehouse.stockValue),
                    unit: format.currency,
                  },
                  {
                    key: "sku",
                    label: t("skuCount"),
                    value: formatNumber(warehouse.skuCount),
                    unit: t("skuUnit"),
                  },
                ]}
              />
              {warehouse.out.length > 0 ? (
                <StockList
                  title={t("out")}
                  items={warehouse.out.map((item) => ({
                    key: `${item.product}·${item.filial}`,
                    product: item.product,
                    note: item.filial,
                    pill: (
                      <Pill intent="crit" icon={OctagonAlert}>
                        {t("outPill")}
                      </Pill>
                    ),
                  }))}
                />
              ) : null}
              {warehouse.low.length > 0 ? (
                <StockList
                  title={t("low")}
                  items={warehouse.low.map((item) => ({
                    key: `${item.product}·${item.filial}`,
                    product: item.product,
                    note: t("lowNote", { filial: item.filial, count: item.minQuantity }),
                    pill: <Pill intent="warn">{t("lowPill", { count: item.quantity })}</Pill>,
                  }))}
                />
              ) : null}
              {warehouse.out.length === 0 && warehouse.low.length === 0 ? (
                <p className="text-ink-3 mt-3.5 text-xs">{t("allStocked")}</p>
              ) : null}
            </>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
