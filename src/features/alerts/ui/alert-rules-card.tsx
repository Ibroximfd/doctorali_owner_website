"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { ListSkeleton, QueryState } from "@/shared/ui/states";
import { Switch } from "@/shared/ui/switch";

import { useRuleLabel, useUnitLabel } from "../hooks/use-alert-labels";
import { useAlertRulesQuery, useUpdateAlertRule } from "../hooks/use-alert-rules";
import { formatThreshold, parseThreshold } from "../model/alerts.rules";
import type { AlertRule, AlertRulePatch } from "../model/alerts.schema";

/** Signal chegaralari kartasi — "Sozlamalar" sahifasida ko'rsatiladi. */
export const AlertRulesCard = ({ className }: { className?: string }) => {
  const t = useTranslations("alerts.rulesCard");
  const query = useAlertRulesQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={8} />}
          isEmpty={(rules) => rules.length === 0}
        >
          {(rules) => (
            <ul>
              {rules.map((rule) => (
                <RuleRow key={rule.code} rule={rule} />
              ))}
            </ul>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};

/**
 * Bitta qoida: chegara maydondan chiqilganda (yoki Enter bilan) saqlanadi —
 * faqat o'zgargan va yaroqli bo'lsa; yoqish/o'chirish darhol saqlanadi.
 */
const RuleRow = ({ rule }: { rule: AlertRule }) => {
  const t = useTranslations("alerts.rulesCard");
  const tCommon = useTranslations("common");
  const inputId = useId();
  const unitId = `${inputId}-unit`;
  const errorId = `${inputId}-error`;
  const label = useRuleLabel()(rule.code);
  const unit = useUnitLabel()(rule.unit);
  const update = useUpdateAlertRule();
  /** `null` — maydon saqlangan qiymatni ko'rsatadi; satr — hali saqlanmagan qoralama. */
  const [draft, setDraft] = useState<string | null>(null);
  const [isInvalid, setIsInvalid] = useState(false);

  const save = (patch: AlertRulePatch, onSaved?: () => void) => {
    if (update.isPending) return;
    update.mutate(
      { code: rule.code, patch },
      {
        onSuccess: () => {
          toast.success(tCommon("saved"));
          onSaved?.();
        },
        // Qoralama saqlanib qoladi — maydondan qayta chiqilganda yana uriniladi.
        onError: () => toast.error(tCommon("saveFailed")),
      },
    );
  };

  const commitThreshold = () => {
    if (draft === null) return;
    const threshold = parseThreshold(draft);
    if (threshold === null) {
      setIsInvalid(true);
      return;
    }
    if (threshold === rule.params.threshold) {
      setDraft(null);
      return;
    }
    save({ threshold }, () => setDraft(null));
  };

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="min-w-0 flex-1 basis-40 leading-tight">
        <label htmlFor={inputId} className="text-sm font-semibold">
          {label}
        </label>
        <div id={unitId} className="text-ink-3 mt-0.5 text-xs">
          {unit}
        </div>
        {isInvalid ? (
          <p id={errorId} role="alert" className="text-crit mt-1 text-xs">
            {t("invalid")}
          </p>
        ) : null}
      </div>
      <Input
        id={inputId}
        inputMode="decimal"
        autoComplete="off"
        value={draft ?? formatThreshold(rule.params.threshold)}
        disabled={update.isPending}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? `${unitId} ${errorId}` : unitId}
        onChange={(event) => {
          setDraft(event.target.value);
          setIsInvalid(false);
        }}
        onBlur={commitThreshold}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className="num h-8.5 w-28 text-right text-sm"
      />
      <Switch
        checked={rule.enabled}
        disabled={update.isPending}
        aria-label={t("toggle", { rule: label })}
        onCheckedChange={(enabled) => save({ enabled })}
      />
    </li>
  );
};
