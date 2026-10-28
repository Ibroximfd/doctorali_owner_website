"use client";

import { CircleCheck, Clock, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Pill, type PillIntent } from "@/shared/ui/pill";

import { isSettlementStatus, type SettlementStatus } from "../model/settlements.rules";

const STATUS_PILL: Record<SettlementStatus, { intent: PillIntent; icon: LucideIcon }> = {
  overdue: { intent: "crit", icon: OctagonAlert },
  debt: { intent: "warn", icon: TriangleAlert },
  partial: { intent: "info", icon: Clock },
  paid: { intent: "good", icon: CircleCheck },
};

export const SettlementStatusPill = ({ status }: { status: string }) => {
  const t = useTranslations("settlements.status");
  if (!isSettlementStatus(status)) return <Pill>{status}</Pill>;
  const { intent, icon } = STATUS_PILL[status];
  return (
    <Pill intent={intent} icon={icon}>
      {t(status)}
    </Pill>
  );
};
