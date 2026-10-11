"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { KvList } from "@/shared/ui/kv-list";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useAppLoyaltyQuery } from "../hooks/use-mobile-app";
import { isLoyaltyEmpty } from "../model/mobile-app.rules";

/** Keshbek ballari va sovg'alar: berildi, sarflandi, kuydi; hamyonlardagi qoldiq — hozirgi holat. */
export const LoyaltyCard = ({ className }: { className?: string }) => {
  const t = useTranslations("mobileApp.loyalty");
  const format = useFormat();
  const query = useAppLoyaltyQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={6} />}
          isEmpty={({ data }) => isLoyaltyEmpty(data)}
        >
          {({ data }) => (
            <KvList
              rows={[
                { key: "issued", label: t("pointsIssued"), value: formatNumber(data.pointsIssued) },
                { key: "spent", label: t("pointsSpent"), value: formatNumber(data.pointsSpent) },
                { key: "expired", label: t("pointsExpired"), value: formatNumber(data.pointsExpired) },
                {
                  key: "wallet",
                  label: t("walletBalance"),
                  value: formatNumber(data.walletBalanceTotal),
                  hint:
                    data.walletBalanceUzs === null
                      ? undefined
                      : t("walletEquivalent", { value: format.money(data.walletBalanceUzs) }),
                },
                { key: "giftsEarned", label: t("giftsEarned"), value: formatNumber(data.giftsEarned) },
                {
                  key: "giftsDelivered",
                  label: t("giftsDelivered"),
                  value: formatNumber(data.giftsDelivered),
                },
              ]}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
