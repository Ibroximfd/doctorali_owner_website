"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { EmptyState, ListSkeleton, QueryState } from "@/shared/ui/states";

import { useFeedQuery } from "../hooks/use-overview";
import { feedDotClass } from "../model/overview.rules";

/** «Hozir» — muhim hodisalar vaqt chizig'i. Yangi kelgan qator qisqa yorishadi. Ro'yxat `aria-live` emas: har yangilanishda butun lenta qayta o'qilib ketardi. */
export const LiveFeed = ({ className }: { className?: string }) => {
  const t = useTranslations("overview.feed");
  const format = useFormat();
  const query = useFeedQuery();
  const reduce = useReducedMotion();

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
            <ol className="relative px-4 pt-1 pb-3 md:px-5.5">
              <span
                aria-hidden
                className="from-accent/50 absolute top-2 bottom-4 left-5.5 w-px bg-linear-to-b to-transparent md:left-7"
              />
              {events.map((event, index) => (
                <motion.li
                  key={event.id}
                  initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.6, delay: reduce ? 0 : index * 0.08, ease: EASE_OUT }}
                  className={cn("relative rounded-lg py-2 pl-6", index === 0 && "animate-flash")}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "bg-surface absolute top-3 left-0 grid size-3 place-items-center rounded-full",
                    )}
                  >
                    <span className={cn("size-2 rounded-full", feedDotClass(event.kind))} />
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 text-sm leading-snug font-semibold">{event.title}</span>
                    {event.amount === null ? null : (
                      <span className="num text-xs font-semibold whitespace-nowrap">
                        {formatNumber(event.amount)}
                      </span>
                    )}
                  </div>
                  <div className="text-ink-3 mt-0.5 text-xs">
                    {[event.filial, event.actor].filter(Boolean).join(" · ")}
                    {event.filial || event.actor ? " · " : null}
                    <time dateTime={event.at} className="num">
                      {format.time(event.at)}
                    </time>
                  </div>
                </motion.li>
              ))}
            </ol>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
