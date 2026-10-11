"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Banner } from "@/shared/ui/banner";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { KvList, type KvRow } from "@/shared/ui/kv-list";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useLiabilitiesQuery } from "../hooks/use-finance";
import { totalLiabilities } from "../model/finance.rules";

/** Yorliq + kichik izoh ("· 11 shifokor"). Izoh bo'lmasa faqat yorliq. */
const labelWithNote = (label: string, note?: string): ReactNode => (
  <>
    <span className="truncate">{label}</span>
    {note ? <span className="text-2xs text-ink-3 shrink-0">· {note}</span> : null}
  </>
);

/** Hali to'lanmagan majburiyatlar: komissiya, shifokor to'lovlari, keshbek, sovg'alar. */
export const LiabilitiesCard = ({ className }: { className?: string }) => {
  const t = useTranslations("finance.liabilities");
  const format = useFormat();
  const query = useLiabilitiesQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState query={query} skeleton={<ListSkeleton rows={5} />}>
          {({ data }) => {
            const rows: KvRow[] = [
              {
                key: "operatorCommission",
                label: labelWithNote(t("operatorCommission"), t("operatorCommissionNote")),
                value: format.moneyCompact(data.operatorCommissionPending),
                hint: format.currency,
              },
              {
                key: "doctorPayouts",
                label: labelWithNote(
                  t("doctorPayouts"),
                  data.doctorsWaiting === null
                    ? undefined
                    : t("doctorPayoutsNote", { count: formatNumber(data.doctorsWaiting) }),
                ),
                value: format.moneyCompact(data.doctorPayoutsOutstanding),
                hint: format.currency,
              },
              {
                key: "cashback",
                label: labelWithNote(
                  t("cashback"),
                  t("cashbackNote", { points: formatNumber(data.cashbackPoints.points) }),
                ),
                value: format.moneyCompact(data.cashbackPoints.uzsEquivalent),
                hint: format.currency,
              },
              {
                key: "gifts",
                label: labelWithNote(t("gifts"), t("giftsNote", { count: formatNumber(data.gifts.count) })),
                value: format.moneyCompact(data.gifts.costEstimate),
                hint: format.currency,
              },
            ];

            return (
              <>
                <KvList rows={rows} />
                <Banner
                  className="mt-3"
                  action={
                    <b className="num text-ink font-semibold">{format.money(totalLiabilities(data))}</b>
                  }
                >
                  {t("total")}
                </Banner>
              </>
            );
          }}
        </QueryState>
      </CardBody>
    </Card>
  );
};
