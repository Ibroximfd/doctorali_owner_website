"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { AnimatedNumber } from "@/shared/ui/motion/animated-number";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { QueryState, StatRowSkeleton } from "@/shared/ui/states";

import { useSettlementsSummaryQuery } from "../hooks/use-settlements";

export const SettlementsKpis = () => {
  const t = useTranslations("settlements.kpi");
  const format = useFormat();
  const query = useSettlementsSummaryQuery();

  return (
    <QueryState query={query} skeleton={<StatRowSkeleton count={4} />}>
      {({ data }) => (
        <StatRow columns={4}>
          <StatTile
            label={t("receivable")}
            value={<AnimatedNumber value={data.receivable} format={format.moneyCompact} />}
            unit={format.currency}
            note={t("b2b", { value: format.moneyCompact(data.b2bDebt) })}
          />
          <StatTile
            label={t("overdue")}
            value={<AnimatedNumber value={data.overdue} format={format.moneyCompact} />}
            unit={format.currency}
            note={t("overdueNote")}
          />
          <StatTile
            label={t("collected")}
            value={format.moneyCompact(data.collected.value)}
            unit={format.currency}
            delta={data.collected.deltaPct}
          />
          <StatTile
            label={t("expenses")}
            value={format.moneyCompact(data.expenses.value)}
            unit={format.currency}
            delta={data.expenses.deltaPct}
            invertDelta
          />
        </StatRow>
      )}
    </QueryState>
  );
};
