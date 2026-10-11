"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EmptyState, ListSkeleton, QueryState } from "@/shared/ui/states";

import { useFeedQuery } from "../hooks/use-overview";
import { feedDotClass } from "../model/overview.rules";

/** Muhim hodisalar oqimi. Yangi kelgan qator qisqa yorishadi. Ro'yxat `aria-live` emas: har yangilanishda butun lenta qayta o'qilib ketardi. */
export const LiveFeed = ({ className }: { className?: string }) => {
  const t = useTranslations("overview.feed");
  const format = useFormat();
  const query = useFeedQuery();

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={t("description")}
        action={
          <span className="text-ink-2 inline-flex items-center gap-1.5 text-xs">
            <span aria-hidden className="animate-live bg-good size-2 rounded-full" />
            {t("live")}
          </span>
        }
      />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={5} className="px-4.5 py-2" />}
          isEmpty={(events) => events.length === 0}
          empty={<EmptyState />}
        >
          {(events) => (
            <ul>
              {events.map((event, index) => (
                <li
                  key={event.id}
                  className={cn(
                    "flex items-start gap-2.5 border-b px-3.5 py-2 text-xs last:border-b-0 md:px-4.5",
                    index === 0 && "animate-flash",
                  )}
                >
                  <time
                    dateTime={event.at}
                    className="num text-2xs text-ink-3 w-9.5 shrink-0 pt-px font-medium"
                  >
                    {format.time(event.at)}
                  </time>
                  <span
                    aria-hidden
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", feedDotClass(event.kind))}
                  />
                  <p className="text-ink-2 min-w-0 flex-1 leading-snug">
                    <span className="text-ink">{event.title}</span>
                    {event.filial ? <span className="text-ink-3"> · {event.filial}</span> : null}
                  </p>
                  {event.amount === null ? null : (
                    <span className="num font-semibold whitespace-nowrap">{formatNumber(event.amount)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
