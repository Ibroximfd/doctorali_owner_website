"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatDecimal, formatNumber } from "@/shared/lib/format";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { BlockSkeleton, QueryState } from "@/shared/ui/states";

import { useForecastSummaryQuery, useStockoutsQuery } from "../hooks/use-forecast";
import { spreadPct } from "../model/forecast.rules";

type Tone = "neutral" | "ember" | "gold";

const TONE: Record<Tone, { box: string; value: string }> = {
  neutral: { box: "panel-surface", value: "text-ink" },
  ember: { box: "border-ember/30 bg-ember/5", value: "text-ember" },
  gold: { box: "border-gold/25 bg-gold/5", value: "text-gold" },
};

type HighlightProps = { label: string; value: ReactNode; text: ReactNode; tone: Tone; delay: number };

const Highlight = ({ label, value, text, tone, delay }: HighlightProps) => {
  const reduce = useReducedMotion();
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, delay, ease: EASE_OUT }}
      className={cn("min-w-0 rounded-3xl border p-5", TONE[tone].box)}
    >
      <h3 className="text-ink-2 text-sm">{label}</h3>
      <div className={cn("font-display mt-2 text-3xl", TONE[tone].value)}>{value}</div>
      <p className="text-ink-2 mt-2 text-sm leading-relaxed">{text}</p>
    </motion.article>
  );
};

/** Eng yaqin tugaydigan mahsulot — ember karta (bo'lmasa — «zaxira yetarli»). */
const StockoutHighlight = () => {
  const t = useTranslations("forecast.highlights");
  const format = useFormat();
  const query = useStockoutsQuery();

  return (
    <QueryState query={query} skeleton={<BlockSkeleton className="h-40 rounded-3xl" />}>
      {(response) => {
        const first = response.data[0];
        return first ? (
          <Highlight
            tone="ember"
            delay={0.1}
            label={t("stockout")}
            value={format.date(first.stockoutDate)}
            text={t("stockoutText", {
              name: first.name,
              warehouse: first.warehouseName,
              days: formatDecimal(first.daysLeft),
              reorder: formatNumber(first.reorderQty),
            })}
          />
        ) : (
          <Highlight
            tone="neutral"
            delay={0.1}
            label={t("stockout")}
            value={t("noStockout")}
            text={t("noStockoutText")}
          />
        );
      }}
    </QueryState>
  );
};

/** Grafik ostidagi 3 xulosa: kutilgan buyurtma, eng yaqin tugash, kutilgan pul kirimi. */
export const ForecastHighlights = () => {
  const t = useTranslations("forecast.highlights");
  const format = useFormat();
  const query = useForecastSummaryQuery();

  return (
    <QueryState
      query={query}
      skeleton={
        <div className="grid gap-4 md:grid-cols-3">
          <BlockSkeleton className="h-40 rounded-3xl" />
          <BlockSkeleton className="h-40 rounded-3xl" />
          <BlockSkeleton className="h-40 rounded-3xl" />
        </div>
      }
    >
      {({ data }) => (
        <div className="grid gap-4 md:grid-cols-3">
          <Highlight
            tone="neutral"
            delay={0}
            label={t("orders", { count: data.horizonDays })}
            value={<span className="num">{formatNumber(data.orders.expected)}</span>}
            text={t("ordersText", {
              perDay: formatNumber(Math.round(data.orders.expected / Math.max(data.horizonDays, 1))),
              low: formatNumber(data.orders.low),
              high: formatNumber(data.orders.high),
            })}
          />
          <StockoutHighlight />
          <Highlight
            tone="gold"
            delay={0.2}
            label={t("cashIn")}
            value={
              <>
                <span className="num">{format.moneyCompact(data.cashIn.expected)}</span>
                <span className="text-ink-3 ml-1.5 font-sans text-sm">{format.currency}</span>
              </>
            }
            text={t("cashInText", {
              low: format.moneyCompact(data.cashIn.low),
              high: format.moneyCompact(data.cashIn.high),
              spread: spreadPct(data.cashIn) ?? "—",
            })}
          />
        </div>
      )}
    </QueryState>
  );
};
