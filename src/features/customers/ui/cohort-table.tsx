"use client";

import { useTranslations } from "next-intl";

import { SEQ_BG, SEQ_TEXT } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { SeqScale } from "@/shared/ui/seq-scale";
import { BlockSkeleton, QueryState } from "@/shared/ui/states";
import { Tip } from "@/shared/ui/tip";

import { useCohortsQuery } from "../hooks/use-customers";
import { cohortMonths, retainedCustomers, retentionStep } from "../model/customers.rules";
import type { Cohort } from "../model/customers.schema";

const HEAD_CELL = "px-1.5 py-1 text-2xs font-medium whitespace-nowrap text-ink-3";

/**
 * Kogorta jadvali: qator — birinchi xarid oyi, ustun — undan keyingi oy,
 * katak — o'sha oyda yana xarid qilganlar ulushi. Rang ketma-ket shkalada
 * (ochdan to'qqa); har katak fokuslanadi va qiymatini aytadi.
 */
export const CohortTable = ({ className }: { className?: string }) => {
  const t = useTranslations("customers.cohorts");
  const query = useCohortsQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<BlockSkeleton className="h-60" />}
          isEmpty={({ data }) => data.length === 0}
        >
          {({ data }) => (
            <>
              {/* keng jadval sahifani emas, faqat o'z konteynerini aylantiradi */}
              <div className="overflow-x-auto">
                <CohortGrid cohorts={data} />
              </div>
              <SeqScale lowLabel={t("low")} highLabel={t("high")} />
            </>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};

const CohortGrid = ({ cohorts }: { cohorts: readonly Cohort[] }) => {
  const t = useTranslations("customers.cohorts");
  const format = useFormat();
  const months = cohortMonths(cohorts);

  return (
    <table className="w-full min-w-120 border-separate border-spacing-0.5 text-xs">
      <thead>
        <tr>
          <th scope="col" className={cn(HEAD_CELL, "pl-0 text-left")}>
            {t("firstPurchase")}
          </th>
          <th scope="col" className={cn(HEAD_CELL, "text-right")}>
            {t("size")}
          </th>
          {months.map((index) => (
            <th key={index} scope="col" className={cn(HEAD_CELL, "text-center")}>
              {t("month", { index })}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {cohorts.map((cohort) => {
          const name = format.month(cohort.cohort);
          return (
            <tr key={cohort.cohort}>
              <th scope="row" className="font-strong pr-2 text-left whitespace-nowrap">
                {name}
              </th>
              <td className="num text-ink-3 px-1.5 text-right">{formatNumber(cohort.size)}</td>
              {months.map((index) => {
                const percent = cohort.retention[index];
                return (
                  <td key={index} className="p-0">
                    {percent === undefined ? null : (
                      <RetentionCell cohortName={name} size={cohort.size} index={index} percent={percent} />
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

type RetentionCellProps = { cohortName: string; size: number; index: number; percent: number };

const RetentionCell = ({ cohortName, size, index, percent }: RetentionCellProps) => {
  const t = useTranslations("customers.cohorts");
  const step = retentionStep(percent);
  const percentLabel = formatPercent(percent, 0);
  const customersLabel = formatNumber(retainedCustomers(size, percent));

  return (
    <Tip
      content={
        <>
          <div className="text-2xs text-ink-3">{t("cellTitle", { cohort: cohortName, index })}</div>
          <dl className="mt-1 flex flex-col gap-0.5">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">{t("returned")}</dt>
              <dd className="num font-strong">{percentLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">{t("customers")}</dt>
              <dd className="num font-strong">{customersLabel}</dd>
            </div>
          </dl>
        </>
      }
    >
      <button
        type="button"
        aria-label={t("cellLabel", {
          cohort: cohortName,
          index,
          percent: percentLabel,
          customers: customersLabel,
        })}
        className={cn(
          "num text-2xs block w-full min-w-11 rounded-sm px-1 py-1.5 text-center font-semibold",
          SEQ_BG[step],
          SEQ_TEXT[step],
        )}
      >
        {percentLabel}
      </button>
    </Tip>
  );
};
