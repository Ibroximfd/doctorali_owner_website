"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { formatDecimal, formatNumber } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { KvList } from "@/shared/ui/kv-list";
import { StatRow, StatTile } from "@/shared/ui/stat-tile";
import { ListSkeleton, QueryState, StatRowSkeleton } from "@/shared/ui/states";

import { useUsageQuery } from "../hooks/use-ai";
import { useUsageMonth } from "../hooks/use-ai-tab";
import { shiftMonth } from "../model/ai.rules";
import type { AiUsage } from "../model/ai.schema";

/** Narx satr bo'lib keladi (`"1.414450"`) — ekranda sentgacha. */
const cost = (value: string): string => formatDecimal(Number(value), 2);

/** AI xarajati (TZ 32 §I-4): oy bo'yicha chaqiruvlar, tokenlar, narx (USD), tur kesimi, chegaralar. */
export const UsagePanel = () => {
  const t = useTranslations("ai.usage");
  const format = useFormat();
  const { month, current, setMonth } = useUsageMonth();
  const query = useUsageQuery(month);

  return (
    <section aria-labelledby="ai-usage-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <h2 id="ai-usage-title" className="font-strong text-lg">
            {t("title")}
          </h2>
          <p className="text-ink-3 text-xs">{t("description")}</p>
        </div>
        <div className="flex items-center gap-1 sm:ml-auto" role="group" aria-label={t("monthLabel")}>
          <Button
            size="icon"
            intent="ghost"
            aria-label={t("prevMonth")}
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <span className="min-w-32 text-center text-sm font-semibold" aria-live="polite">
            {format.month(month)}
          </span>
          <Button
            size="icon"
            intent="ghost"
            aria-label={t("nextMonth")}
            disabled={month >= current}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
      <QueryState
        query={query}
        skeleton={
          <div className="flex flex-col gap-3">
            <StatRowSkeleton count={4} />
            <ListSkeleton rows={3} />
          </div>
        }
      >
        {(usage) => <UsageBody usage={usage} />}
      </QueryState>
    </section>
  );
};

const UsageBody = ({ usage }: { usage: AiUsage }) => {
  const t = useTranslations("ai.usage");
  const kind = (key: string) => (t.has(`kinds.${key}`) ? t(`kinds.${key}`) : key);
  return (
    <>
      <StatRow columns={4}>
        <StatTile label={t("cost")} value={cost(usage.costUsd)} unit={usage.currency} />
        <StatTile label={t("calls")} value={formatNumber(usage.calls)} />
        <StatTile label={t("inputTokens")} value={formatNumber(usage.inputTokens)} />
        <StatTile label={t("outputTokens")} value={formatNumber(usage.outputTokens)} />
      </StatRow>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader
            title={t("byKind")}
            description={usage.model ? t("model", { model: usage.model }) : undefined}
          />
          <CardBody>
            {usage.byKind.length === 0 ? (
              <p className="text-ink-3 text-sm">{t("noCalls")}</p>
            ) : (
              <KvList
                rows={usage.byKind.map((row) => ({
                  key: row.kind,
                  label: kind(row.kind),
                  value: `${cost(row.costUsd)} ${usage.currency}`,
                  hint: t("kindHint", {
                    calls: formatNumber(row.calls),
                    input: formatNumber(row.inputTokens),
                    output: formatNumber(row.outputTokens),
                  }),
                }))}
              />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("limits")} description={t("limitsNote")} />
          <CardBody>
            <KvList
              rows={[
                {
                  key: "rate",
                  label: t("ratePerMin"),
                  value: formatNumber(usage.limits?.ratePerMin ?? null),
                },
                {
                  key: "chat",
                  label: t("maxTokensChat"),
                  value: formatNumber(usage.limits?.maxTokensChat ?? null),
                },
                {
                  key: "analysis",
                  label: t("maxTokensAnalysis"),
                  value: formatNumber(usage.limits?.maxTokensAnalysis ?? null),
                },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
};
