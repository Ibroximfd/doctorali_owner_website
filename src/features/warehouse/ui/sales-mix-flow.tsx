"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useId } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { EASE_OUT } from "@/shared/ui/motion/reveal";

import { buildMixFlow, FLOW_BOX, LABEL_X, NODE_WIDTH, type MixKind } from "../model/sales-mix-flow";
import type { SalesMix } from "../model/warehouse.schema";

const KNOWN_REASONS = [
  "operator_discount",
  "loyalty_points",
  "promo_code",
  "bulk",
  "doctor",
  "promo_2plus1",
  "compensation",
  "sample",
  "other",
];

/** Tur → rang: tugun, oqim gradienti va raqam bir xil ma'noda. */
const KIND_TONE: Record<MixKind, { node: string; text: string; stop: string }> = {
  full: { node: "fill-good", text: "text-good", stop: "var(--good)" },
  discount: { node: "fill-warn", text: "text-warn", stop: "var(--warn)" },
  gift: { node: "fill-series-7", text: "text-series-7", stop: "var(--series-7)" },
};

/** `viewBox` birligi → konteyner foizi (yorliqlarni SVG ustiga joylash uchun). */
const pctX = (x: number): string => `${(x / FLOW_BOX.width) * 100}%`;
const pctY = (y: number): string => `${(y / FLOW_BOX.height) * 100}%`;

/**
 * Oqim (sankey): ombordan chiqqan jami → to'liq narx / chegirma / sovg'a → sabablar.
 * Oqimlar ketma-ket ochiladi; harakat kamaytirilganda — darhol.
 */
export const SalesMixFlow = ({ mix }: { mix: SalesMix }) => {
  const t = useTranslations("warehouse.mix");
  const format = useFormat();
  const reduce = useReducedMotion();
  const gradientId = useId();
  const flow = buildMixFlow(mix);
  const reasonLabel = (reason: string) => (KNOWN_REASONS.includes(reason) ? t(`reasons.${reason}`) : reason);
  const kindTotal = (kind: MixKind) =>
    kind === "full"
      ? format.moneyCompact(mix.totals.fullRevenue)
      : kind === "discount"
        ? format.moneyCompact(mix.totals.discountRevenue)
        : format.moneyCompact(mix.totals.giftValue);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-ink-2 text-sm">
        <span className="text-gold font-semibold">{t("source")}</span>{" "}
        <span className="num text-gold">{formatNumber(flow.total)}</span>{" "}
        <span className="text-ink-3">{t("unitsSuffix")}</span>
      </figcaption>
      <div className="relative h-80 w-full md:h-96">
        <svg
          role="img"
          aria-label={t("flowLabel", {
            full: formatNumber(mix.totals.fullUnits),
            discount: formatNumber(mix.totals.discountUnits),
            gift: formatNumber(mix.totals.giftUnits),
          })}
          viewBox={`0 0 ${FLOW_BOX.width} ${FLOW_BOX.height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          <defs>
            {flow.kinds.map((node) => (
              <linearGradient key={node.kind} id={`${gradientId}-${node.kind}`} x1="0" x2="1">
                <stop offset="0" stopColor="var(--gold)" stopOpacity={0.45} />
                <stop offset="1" stopColor={KIND_TONE[node.kind].stop} stopOpacity={0.55} />
              </linearGradient>
            ))}
          </defs>

          {flow.links.map((link) => {
            const toReason = link.key.startsWith("reason-");
            return (
              <motion.path
                key={link.key}
                d={link.path}
                fill={toReason ? undefined : `url(#${gradientId}-${link.kind})`}
                className={toReason ? KIND_TONE[link.kind].node : undefined}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: toReason ? 0.3 : 1 }}
                transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.15 + link.order * 0.12 }}
              />
            );
          })}

          {reduce
            ? null
            : flow.links.map((link) => (
                // CSS animatsiya (JS kadr sikli emas) — oqim chizig'i doimiy harakatda.
                <path
                  key={`${link.key}-line`}
                  d={link.line}
                  fill="none"
                  className="stroke-ink/30 animate-dash"
                  strokeWidth={1.5}
                  strokeDasharray="3 13"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

          <rect
            x={flow.source.x}
            y={flow.source.y}
            width={NODE_WIDTH}
            height={flow.source.height}
            rx={4}
            className="fill-gold"
          />
          {flow.kinds.map((node) => (
            <rect
              key={node.key}
              x={node.x}
              y={node.y}
              width={NODE_WIDTH}
              height={Math.max(node.height, 2)}
              rx={4}
              className={KIND_TONE[node.kind].node}
            />
          ))}
          {flow.reasons.map((node) => (
            <rect
              key={node.key}
              x={node.x}
              y={node.y}
              width={NODE_WIDTH - 2}
              height={Math.max(node.height, 2)}
              rx={3}
              className={KIND_TONE[node.kind].node}
            />
          ))}
        </svg>

        {/* Yorliqlar HTML da: matn cho'zilmaydi; joyi — hisoblangan foiz. */}
        {flow.kinds.map((node) => (
          <div
            key={node.key}
            className="absolute max-w-1/3 -translate-y-1/2 leading-tight"
            style={{ left: pctX(LABEL_X.kind), top: pctY(node.labelY) }}
          >
            <div className="text-ink truncate text-xs font-bold md:text-sm">{t(node.kind)}</div>
            <div className={cn("num text-2xs truncate md:text-xs", KIND_TONE[node.kind].text)}>
              {formatNumber(node.units)} · {kindTotal(node.kind)}
            </div>
          </div>
        ))}
        {flow.reasons.map((node) => (
          <div
            key={node.key}
            className="absolute right-0 -translate-y-1/2 leading-tight"
            style={{ left: pctX(LABEL_X.reason), top: pctY(node.labelY) }}
          >
            <div className="text-ink-2 text-2xs truncate md:text-sm">{reasonLabel(node.reason)}</div>
            <div className={cn("num text-2xs truncate md:text-xs", KIND_TONE[node.kind].text)}>
              {formatNumber(node.units)} · {format.moneyCompact(node.amount)}
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
};
