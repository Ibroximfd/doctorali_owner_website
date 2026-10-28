"use client";

import { Clock, Hand } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DrawerSection } from "@/shared/ui/drawer";
import { Pill, type PillIntent } from "@/shared/ui/pill";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useHandoversQuery } from "../hooks/use-logistics";

const DECISION: Record<string, PillIntent> = { accepted: "good", rejected: "crit", cancelled: "neutral" };

/** Kassaga topshirish: kuryerlar kutayotgan so'rovlar va kassirning so'nggi qarorlari. Faqat ko'rish. */
export const HandoversCard = ({ className }: { className?: string }) => {
  const t = useTranslations("logistics.handovers");
  const format = useFormat();
  const relative = useRelativeTime();
  const query = useHandoversQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState query={query} skeleton={<ListSkeleton rows={5} />}>
          {({ data }) => (
            <div className="flex flex-col gap-4">
              {data.pending.length === 0 ? (
                <p className="text-ink-3 text-sm">{t("noPending")}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {data.pending.map((row) => (
                    <li key={row.id} className="bg-warn-soft flex items-center gap-2.5 rounded-lg px-3 py-2">
                      <Hand aria-hidden className="text-warn size-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{row.courierName}</span>
                        <span className="text-2xs text-ink-3 inline-flex items-center gap-1">
                          <Clock aria-hidden className="size-3" />
                          {relative(row.requestedAt)}
                        </span>
                      </span>
                      <span className="num text-sm font-semibold">{format.moneyCompact(row.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {data.recent.length > 0 ? (
                <DrawerSection title={t("recent")}>
                  <ul className="flex flex-col gap-1.5">
                    {data.recent.slice(0, 6).map((row) => (
                      <li key={row.id} className="flex items-center gap-2 text-xs">
                        <Pill intent={DECISION[row.status] ?? "neutral"}>
                          {row.status in DECISION ? t(`status.${row.status}`) : row.status}
                        </Pill>
                        <span className="min-w-0 flex-1 truncate">{row.courierName}</span>
                        <span className="num">{format.moneyCompact(row.amount)}</span>
                        <span className="text-ink-3 text-2xs">{relative(row.decidedAt)}</span>
                      </li>
                    ))}
                  </ul>
                </DrawerSection>
              ) : null}
            </div>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
