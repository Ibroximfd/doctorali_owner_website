"use client";

import { useTranslations } from "next-intl";

import { formatNumber } from "@/shared/lib/format";
import { BarList, type BarListItem } from "@/shared/ui/bar-list";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useOrdersBreakdownQuery } from "../hooks/use-orders";
import { useOrderLabels } from "../hooks/use-order-labels";
import { clientCancellations, collapseTail, hasNoCounts, totalCount } from "../model/orders.rules";
import type { BreakdownRow } from "../model/orders.schema";

const VISIBLE_REASONS = 6;
const REST_KEY = "__rest";

/** Atkaz sabablari: eng ko'plari alohida, qolgani bitta qatorda; mijozning o'zi ilovada bekor qilgani — izohda. */
export const CancelReasonsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("orders.cancelReasons");
  const query = useOrdersBreakdownQuery("cancel_reason");
  const rows = query.data?.data;

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={rows ? t("description", { count: formatNumber(totalCount(rows)) }) : undefined}
      />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={VISIBLE_REASONS + 1} />}
          isEmpty={({ data }) => hasNoCounts(data)}
        >
          {({ data }) => <CancelReasons rows={data} />}
        </QueryState>
      </CardBody>
    </Card>
  );
};

const CancelReasons = ({ rows }: { rows: BreakdownRow[] }) => {
  const t = useTranslations("orders.cancelReasons");
  const labels = useOrderLabels();
  const { head, restCount } = collapseTail(rows, VISIBLE_REASONS);
  const byClient = clientCancellations(rows);

  const items: BarListItem[] = head.map((row) => ({
    key: row.key,
    label: labels.cancelReason(row.key, row.label),
    value: row.count,
  }));
  if (restCount > 0) items.push({ key: REST_KEY, label: t("rest"), value: restCount });

  return (
    <>
      <BarList items={items} />
      {byClient.total > 0 ? (
        <p className="text-ink-3 mt-3 text-xs leading-relaxed">
          {t.rich("clientNote", {
            total: formatNumber(byClient.total),
            staff: formatNumber(byClient.staff),
            product: formatNumber(byClient.product),
            b: (chunks) => <b className="num text-ink font-semibold">{chunks}</b>,
          })}
        </p>
      ) : null}
    </>
  );
};
