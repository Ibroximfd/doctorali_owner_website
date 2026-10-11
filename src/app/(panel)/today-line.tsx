"use client";

import { useSyncExternalStore } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { usePeriodLabel } from "@/shared/hooks/use-period-label";

const subscribe = () => () => {};

/** "Juma, 2-oktabr 2026 · Oxirgi 30 kun". Sana brauzer soatidan — serverda chizilmaydi. */
export const TodayLine = () => {
  const format = useFormat();
  const periodLabel = usePeriodLabel();
  const today = useSyncExternalStore(
    subscribe,
    () => format.longDate(new Date().toISOString()),
    () => null,
  );

  return (
    <>
      {today ? `${today} · ` : null}
      {periodLabel}
    </>
  );
};
