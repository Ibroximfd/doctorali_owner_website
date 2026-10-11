"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { routes } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { KvList } from "@/shared/ui/kv-list";
import { ScopeLink } from "@/shared/ui/scope-link";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useRuleLabel, useThresholdLabel } from "../hooks/use-alert-labels";
import { useAlertRulesQuery } from "../hooks/use-alert-rules";

/** Qoidalar xulosasi: qaysi chegaradan oshganda signal chiqadi. O'zgartirish — "Sozlamalar" da. */
export const RulesSummaryCard = ({ className }: { className?: string }) => {
  const t = useTranslations("alerts.summary");
  const ruleLabel = useRuleLabel();
  const thresholdLabel = useThresholdLabel();
  const query = useAlertRulesQuery();

  return (
    <Card className={cn("self-start", className)}>
      <CardHeader
        title={t("title")}
        description={t("description")}
        action={
          <ScopeLink
            href={routes.settings}
            className="text-accent inline-flex items-center gap-0.5 text-xs font-semibold hover:underline"
          >
            {t("configure")}
            <ChevronRight aria-hidden className="size-3.5" />
          </ScopeLink>
        }
      />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={8} />}
          isEmpty={(rules) => rules.length === 0}
        >
          {(rules) => (
            <KvList
              rows={rules.map((rule) => ({
                key: rule.code,
                label: ruleLabel(rule.code),
                // o'chirilgan qoida xiraroq va "o'chirilgan" izohi bilan — rang yolg'iz signal emas
                value: rule.enabled ? (
                  thresholdLabel(rule)
                ) : (
                  <span className="text-ink-3 font-medium">{thresholdLabel(rule)}</span>
                ),
                hint: rule.enabled ? undefined : t("disabled"),
              }))}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
