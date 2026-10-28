"use client";

import { Download, Eye, KeyRound, LogIn, Pencil, ShieldOff, TimerOff, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useActivityQuery } from "../hooks/use-access";
import { SectionChip } from "./section-chip";

const KIND_ICON: Record<string, LucideIcon> = {
  view: Eye,
  export: Download,
  login: LogIn,
  granted: KeyRound,
  changed: Pencil,
  revoked: ShieldOff,
  expired: TimerOff,
};
const KNOWN_KINDS = Object.keys(KIND_ICON);

/** «Kim, qachon, nimani ko'rdi» — ruxsat berilganlar faolligi va ruxsat o'zgarishlari. */
export const ActivityCard = ({ className }: { className?: string }) => {
  const t = useTranslations("access.activity");
  const relative = useRelativeTime();
  const query = useActivityQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={6} />}
          isEmpty={(events) => events.length === 0}
        >
          {(events) => (
            <ol className="flex flex-col gap-2.5">
              {events.map((event) => {
                const Icon = KIND_ICON[event.kind] ?? Eye;
                return (
                  <li key={event.id} className="flex items-start gap-2.5">
                    <span className="bg-surface-3 text-ink-2 grid size-7 shrink-0 place-items-center rounded-full">
                      <Icon aria-hidden className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 text-xs">
                      <div>
                        <span className="font-semibold">{event.fullName}</span>{" "}
                        <span className="text-ink-2">
                          {KNOWN_KINDS.includes(event.kind) ? t(`kind.${event.kind}`) : event.kind}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {event.section ? (
                          <SectionChip section={event.section} className="text-2xs h-5" />
                        ) : null}
                        <span className="text-2xs text-ink-3">{relative(event.at)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
