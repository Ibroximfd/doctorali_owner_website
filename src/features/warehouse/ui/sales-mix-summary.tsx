"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatPercent } from "@/shared/lib/format";

import type { SalesMix } from "../model/warehouse.schema";

type Tone = "good" | "warn" | "gift";

const TONE: Record<Tone, { box: string; value: string }> = {
  good: { box: "border-good/25 bg-good/5", value: "text-ink" },
  warn: { box: "border-warn/25 bg-warn/5", value: "text-warn" },
  gift: { box: "border-series-7/25 bg-series-7/5", value: "text-series-7" },
};

const Tile = ({
  tone,
  label,
  value,
  note,
}: {
  tone: Tone;
  label: string;
  value: string;
  note?: ReactNode;
}) => (
  <div className={cn("flex min-w-0 flex-col gap-1 rounded-2xl border px-4 py-3.5", TONE[tone].box)}>
    <div className="text-ink-2 text-xs">{label}</div>
    <div className={cn("num text-2xl font-semibold", TONE[tone].value)}>{value}</div>
    {note ? <div className="text-ink-3 text-xs">{note}</div> : null}
  </div>
);

/** Oqim ostidagi uch xulosa: to'liq narxdan tushum, chegirmaga ketgan va sovg'a qiymati. */
export const MixSummary = ({ totals }: { totals: SalesMix["totals"] }) => {
  const t = useTranslations("warehouse.mix");
  const format = useFormat();
  const units = totals.fullUnits + totals.discountUnits + totals.giftUnits;
  const fullShare = units > 0 ? (totals.fullUnits / units) * 100 : null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Tile
        tone="good"
        label={t("fullRevenue")}
        value={`${format.moneyCompact(totals.fullRevenue)} ${format.currency}`}
        note={fullShare === null ? undefined : t("fullShare", { value: formatPercent(fullShare, 0) })}
      />
      <Tile
        tone="warn"
        label={t("discountAmount")}
        value={`${format.moneyCompact(totals.discountAmount)} ${format.currency}`}
        note={t("avgDiscount", { value: formatPercent(totals.avgDiscountPct) })}
      />
      <Tile
        tone="gift"
        label={t("giftValue")}
        value={`${format.moneyCompact(totals.giftValue)} ${format.currency}`}
        note={
          totals.giftCost === null
            ? undefined
            : t("giftCost", { value: format.moneyCompact(totals.giftCost) })
        }
      />
    </div>
  );
};
