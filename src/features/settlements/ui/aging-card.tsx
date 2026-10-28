"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { BarList } from "@/shared/ui/bar-list";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useAgingQuery } from "../hooks/use-settlements";
import { AGING_KEYS, isAgingKey } from "../model/settlements.rules";

/** Qarz necha kundan beri turibdi — eskisi qizilroq. */
const AGING_BAR: Record<(typeof AGING_KEYS)[number], string> = {
  "0_7": "bg-good",
  "8_30": "bg-warn",
  "31_60": "bg-serious",
  "60_plus": "bg-crit",
};

export const AgingCard = ({ className }: { className?: string }) => {
  const t = useTranslations("settlements.aging");
  const format = useFormat();
  const query = useAgingQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={4} />}
          isEmpty={({ data }) => data.buckets.every((bucket) => bucket.amount === 0)}
        >
          {({ data }) => (
            <BarList
              format={format.moneyCompact}
              showShare
              items={[...data.buckets]
                .sort(
                  (a, b) =>
                    AGING_KEYS.findIndex((k) => k === a.key) - AGING_KEYS.findIndex((k) => k === b.key),
                )
                .map((bucket) => ({
                  key: bucket.key,
                  label: isAgingKey(bucket.key) ? t(`buckets.${bucket.key}`) : bucket.key,
                  hint: t("count", { count: bucket.count }),
                  value: bucket.amount,
                  barClassName: isAgingKey(bucket.key) ? AGING_BAR[bucket.key] : undefined,
                }))}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
