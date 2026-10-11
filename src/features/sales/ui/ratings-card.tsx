"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { formatDecimal, formatNumber } from "@/shared/lib/format";
import { BarList } from "@/shared/ui/bar-list";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Pill } from "@/shared/ui/pill";
import { BlockSkeleton, ListSkeleton, QueryState } from "@/shared/ui/states";

import { useSalesRatingsQuery } from "../hooks/use-sales";
import { ratingDistribution } from "../model/sales.rules";
import type { LowRating, SalesRatings } from "../model/sales.schema";

const LOW_RATINGS_SHOWN = 3;

/** Mijozlar ilovada qo'ygan baholar: o'rtacha, taqsimot va so'nggi past baholar. */
export const RatingsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("sales.ratings");
  const query = useSalesRatingsQuery();
  const ratings = query.data?.data;

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={ratings ? t("description", { count: formatNumber(ratings.count) }) : undefined}
      />
      <CardBody>
        <QueryState
          query={query}
          skeleton={
            <div className="flex flex-col gap-3">
              <BlockSkeleton className="h-9 w-28" />
              <ListSkeleton rows={5} />
            </div>
          }
          isEmpty={({ data }) => data.count === 0}
        >
          {({ data }) => <RatingsContent ratings={data} />}
        </QueryState>
      </CardBody>
    </Card>
  );
};

const RatingsContent = ({ ratings }: { ratings: SalesRatings }) => {
  const t = useTranslations("sales.ratings");
  const low = ratings.low.slice(0, LOW_RATINGS_SHOWN);

  return (
    <>
      {ratings.avg === null ? null : (
        <div className="mb-3 flex items-baseline gap-2">
          <span className="font-strong text-3xl leading-none tracking-tight">
            {formatDecimal(ratings.avg)}
          </span>
          <span className="text-ink-3 text-xs">{t("average")}</span>
        </div>
      )}

      <BarList
        showShare={false}
        items={ratingDistribution(ratings.distribution).map((row) => ({
          key: String(row.stars),
          label: (
            <>
              <span aria-hidden className="inline-flex items-center gap-1">
                {row.stars}
                <Star className="fill-series-4 text-series-4 size-3" />
              </span>
              <span className="sr-only">{t("stars", { count: row.stars })}</span>
            </>
          ),
          value: row.count,
          // 1–2 yulduz — past baho: holat (atkaz) rangida
          barClassName: row.isLow ? "bg-order-cancelled" : undefined,
        }))}
      />

      <div className="mt-4 border-t pt-3">
        <h3 className="text-2xs text-ink-3 mb-2 font-semibold tracking-widest uppercase">{t("lowTitle")}</h3>
        {low.length === 0 ? (
          <p className="text-ink-3 text-xs">{t("lowEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {low.map((rating) => (
              <LowRatingItem key={`${rating.at}-${rating.operator}`} rating={rating} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

const LowRatingItem = ({ rating }: { rating: LowRating }) => {
  const t = useTranslations("sales.ratings");
  const relativeTime = useRelativeTime();

  return (
    <li className="flex items-start gap-2.5 text-xs">
      <Pill intent="crit" icon={Star} className="mt-0.5 shrink-0">
        {t("stars", { count: rating.stars })}
      </Pill>
      <div className="min-w-0 flex-1 leading-snug">
        <p className={rating.comment ? "text-ink" : "text-ink-3"}>{rating.comment ?? t("noComment")}</p>
        <p className="text-2xs text-ink-3 mt-0.5">
          {t("lowMeta", { operator: rating.operator, client: rating.client })} ·{" "}
          <time dateTime={rating.at}>{relativeTime(rating.at)}</time>
        </p>
      </div>
    </li>
  );
};
