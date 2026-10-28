"use client";

import { CircleCheck, CircleSlash, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Pill, type PillIntent } from "@/shared/ui/pill";

import { isStockStatus, type StockStatus } from "../model/warehouse.rules";

const STATUS_PILL: Record<StockStatus, { intent: PillIntent; icon: LucideIcon }> = {
  out: { intent: "crit", icon: CircleSlash },
  critical: { intent: "crit", icon: OctagonAlert },
  low: { intent: "warn", icon: TriangleAlert },
  ok: { intent: "good", icon: CircleCheck },
  empty: { intent: "neutral", icon: CircleSlash },
};

/** Qoldiq holati belgisi; noma'lum holat — neytral, qiymatning o'zi bilan. */
export const StockStatusPill = ({ status }: { status: string }) => {
  const t = useTranslations("warehouse.status");
  if (!isStockStatus(status)) return <Pill>{status}</Pill>;
  const { intent, icon } = STATUS_PILL[status];
  return (
    <Pill intent={intent} icon={icon}>
      {t(status)}
    </Pill>
  );
};
