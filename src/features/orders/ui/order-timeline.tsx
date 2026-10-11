"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";

import { useOrderLabels } from "../hooks/use-order-labels";
import { newestFirst, timelineDotClass, timelineFacts, timelineTitleKeys } from "../model/orders.rules";
import type { TimelineEvent } from "../model/orders.schema";

/** Buyurtma tarixi, eng yangisi yuqorida. Noma'lum hodisa turi o'z nomi bilan ko'rsatiladi. */
export const OrderTimeline = ({ events }: { events: readonly TimelineEvent[] }) => {
  const t = useTranslations("orders");

  if (events.length === 0) return <p className="text-ink-3 text-sm">{t("drawer.timelineEmpty")}</p>;

  return (
    <ol>
      {newestFirst(events).map((event) => (
        <TimelineItem key={event.id} event={event} />
      ))}
    </ol>
  );
};

const TimelineItem = ({ event }: { event: TimelineEvent }) => {
  const t = useTranslations("orders");
  const format = useFormat();
  const labels = useOrderLabels();
  const facts = timelineFacts(event.payload);

  const details = [
    [labels.actor(event.actor.type), event.actor.name].filter(Boolean).join(" "),
    facts.channel ? labels.confirmationChannel(facts.channel) : null,
    facts.paymentMethod ? labels.paymentMethod(facts.paymentMethod) : null,
    facts.amount === null ? null : format.money(facts.amount),
    facts.courier ? t("timeline.courier", { name: facts.courier }) : null,
    facts.reason ? t("timeline.reason", { reason: labels.cancelReason(facts.reason) }) : null,
    facts.note,
  ].filter((part): part is string => Boolean(part));

  return (
    // vertikal chiziq nuqtalarni bog'laydi; oxirgi hodisada chizilmaydi
    <li className="before:bg-border relative pb-3.5 pl-5 before:absolute before:top-4.5 before:bottom-0.5 before:left-1 before:w-px last:pb-0 last:before:hidden">
      <span
        aria-hidden
        className={cn("absolute top-1.5 left-0 size-2.5 rounded-full", timelineDotClass(event))}
      />
      <p className="font-mid text-sm">
        {labels.first(
          timelineTitleKeys(event).map((key) => `timeline.${key}`),
          event.kind,
        )}
      </p>
      <p className="text-ink-3 mt-0.5 text-xs">
        {details.join(" · ")}
        {details.length > 0 ? " · " : null}
        <time dateTime={event.createdAt} className="num whitespace-nowrap">
          {format.dateTime(event.createdAt)}
        </time>
      </p>
    </li>
  );
};
