import { ArrowDownWideNarrow, ArrowUpNarrowWide, Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Pill } from "@/shared/ui/pill";

import { explainedMetrics } from "../model/ratings.rules";
import type { Formula } from "../model/ratings.schema";

/**
 * «Qanday hisoblanadi» — formulani server yozadi (TZ 32 §A-3a): har ko'rsatkichning `name`, `how`,
 * birligi, yo'nalishi va «—» qachon chiqishi. `score.note` (masalan, «mijoz operatorga baho
 * bermaydi») alohida, ko'zga tashlanadigan qilib chiqadi — boshliq noto'g'ri o'qimasin.
 */
export const FormulaCard = ({ formula, className }: { formula: Formula; className?: string }) => {
  const t = useTranslations("ratings.formula");
  const metrics = explainedMetrics(formula);
  const note = formula.score?.note ?? null;
  if (metrics.length === 0 && note === null) return null;

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        {note ? (
          <p role="note" className="bg-info-soft text-info mb-3 flex gap-2 rounded-xl px-3 py-2.5 text-sm">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            {note}
          </p>
        ) : null}
        <dl className="flex flex-col gap-3">
          {metrics.map((metric) => (
            <div key={metric.key || metric.name} className="flex flex-col gap-1">
              <dt className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                {metric.name || metric.key}
                {metric === formula.score ? <Pill intent="info">{t("main")}</Pill> : null}
                <Pill
                  intent="neutral"
                  icon={metric.direction === "asc" ? ArrowUpNarrowWide : ArrowDownWideNarrow}
                >
                  {t(`direction.${metric.direction}`)}
                </Pill>
                {metric.unit ? <span className="text-ink-3 text-xs font-medium">{metric.unit}</span> : null}
              </dt>
              {metric.how ? <dd className="text-ink-2 text-xs leading-relaxed">{metric.how}</dd> : null}
              {metric.nullWhen ? (
                <dd className="text-ink-3 text-xs">{t("nullWhen", { reason: metric.nullWhen })}</dd>
              ) : null}
              {metric.note && metric !== formula.score ? (
                <dd className="text-ink-3 text-xs">{metric.note}</dd>
              ) : null}
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
};
