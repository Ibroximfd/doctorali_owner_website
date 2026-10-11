"use client";

import { useTranslations } from "next-intl";

import { seriesBg } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { KvList, type KvRow } from "@/shared/ui/kv-list";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useCashPositionQuery } from "../hooks/use-finance";
import { cashPositionTotals } from "../model/finance.rules";

/** Rang "Umumiy" sahifadagi shu blok bilan bir xil: kassa, kuryerlar, onlayn, qarz. */
const Dot = ({ colorIndex }: { colorIndex: number }) => (
  <span aria-hidden className={cn("size-2.5 shrink-0 rounded-xs", seriesBg(colorIndex))} />
);

/** "Pul qayerda turibdi": kassalar (to'lov turi bo'yicha), kuryerlar, onlayn hisob va mijozlar qarzi. */
export const CashPositionCard = ({ className }: { className?: string }) => {
  const t = useTranslations("finance.position");
  const format = useFormat();
  const query = useCashPositionQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState query={query} skeleton={<ListSkeleton rows={6} />}>
          {({ data }) => {
            const totals = cashPositionTotals(data);
            const part = (key: "cash" | "card" | "terminal"): KvRow => ({
              key,
              label: t(key),
              value: <span className="text-ink-3 font-medium">{format.moneyCompact(totals[key])}</span>,
              indent: true,
            });

            const rows: KvRow[] = [
              {
                key: "tills",
                label: (
                  <>
                    <Dot colorIndex={0} />
                    {t("tills")}
                  </>
                ),
                value: format.moneyCompact(totals.tills),
                hint: format.currency,
              },
              part("cash"),
              part("card"),
              part("terminal"),
              {
                key: "cod",
                label: (
                  <>
                    <Dot colorIndex={1} />
                    {t("cod")}
                  </>
                ),
                value: format.moneyCompact(totals.courierCod),
                hint: t("codHint", { count: totals.courierCount }),
              },
              {
                key: "online",
                label: (
                  <>
                    <Dot colorIndex={2} />
                    {t("online")}
                  </>
                ),
                value: format.moneyCompact(totals.online),
                hint: t("onlineHint"),
              },
              {
                key: "debt",
                label: (
                  <>
                    <Dot colorIndex={3} />
                    {t("debt")}
                  </>
                ),
                value: format.moneyCompact(totals.openDebt),
                hint: format.currency,
              },
              {
                key: "overdue",
                // rang yolg'iz emas — yorliqning o'zi "muddati o'tgan" deydi
                label: <span className="text-crit">{t("overdue")}</span>,
                value: <span className="text-crit">{format.moneyCompact(totals.overdueDebt)}</span>,
                indent: true,
              },
            ];

            return <KvList rows={rows} />;
          }}
        </QueryState>
      </CardBody>
    </Card>
  );
};
