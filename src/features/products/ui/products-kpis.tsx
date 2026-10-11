"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { QueryState, StatRowSkeleton } from "@/shared/ui/states";

import { useProductsQuery } from "../hooks/use-products";

/** Oxirgi katak — omborning hozirgi holati: davrga bog'liq emas, o'zgarish belgisi yo'q. */
export const ProductsKpis = () => {
  const t = useTranslations("products.kpi");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const query = useProductsQuery();

  return (
    <QueryState query={query} skeleton={<StatRowSkeleton count={4} />}>
      {({ data: { summary, sparklines, results } }) => (
        <StatRow columns={4}>
          <StatTile
            label={t("units")}
            value={formatNumber(summary.units.value)}
            delta={summary.units.deltaPct}
            note={t("unitsNote", { count: results.length })}
            sparkline={sparklines.units}
          />
          <StatTile
            label={t("revenue")}
            value={format.moneyCompact(summary.revenue.value)}
            unit={format.currency}
            delta={summary.revenue.deltaPct}
            sparkline={sparklines.revenue}
          />
          <StatTile
            label={t("gifts")}
            value={formatNumber(summary.giftUnits.value)}
            unit={tCommon("pcs")}
            delta={summary.giftUnits.deltaPct}
            note={t("giftsNote", { value: format.money(summary.giftCost) })}
          />
          <StatTile
            label={t("stock")}
            value={formatNumber(summary.stockOut + summary.stockLow)}
            unit={t("stockUnit")}
            note={t("stockNote", { out: summary.stockOut, low: summary.stockLow })}
          />
        </StatRow>
      )}
    </QueryState>
  );
};
