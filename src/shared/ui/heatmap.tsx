"use client";

import { SEQ_BG, seqStep } from "@/shared/config/chart-palette";
import { cn } from "@/shared/lib/cn";

import { SeqScale } from "./seq-scale";
import { Tip } from "./tip";

export type HeatmapRow = {
  key: string;
  /** Qisqa yorliq (`Du`). */
  label: string;
  cells: readonly { key: string; value: number; title: string; valueLabel: string }[];
};

type HeatmapProps = {
  rows: readonly HeatmapRow[];
  /** Ustun sarlavhalari (bo'sh satr — yorliqsiz ustun). */
  columnLabels: readonly string[];
  lowLabel: string;
  highLabel: string;
};

/** To'r bo'yicha kattalik: bitta rang, ochdan to'qqa. Har katak fokuslanadi va qiymatini aytadi. */
export const Heatmap = ({ rows, columnLabels, lowLabel, highLabel }: HeatmapProps) => {
  const max = Math.max(1, ...rows.flatMap((row) => row.cells.map((cell) => cell.value)));

  return (
    <div>
      <div
        className="grid items-center gap-0.5"
        // ustunlar soni — ma'lumotdan (hisoblangan qiymat)
        style={{ gridTemplateColumns: `1.75rem repeat(${columnLabels.length}, minmax(0, 1fr))` }}
      >
        <span />
        {columnLabels.map((label, index) => (
          <span key={`${label}-${index}`} className="text-2xs text-ink-3 text-center">
            {label}
          </span>
        ))}
        {rows.map((row) => (
          <div key={row.key} className="contents">
            <span className="text-2xs text-ink-3">{row.label}</span>
            {row.cells.map((cell) => (
              <Tip
                key={cell.key}
                content={
                  <>
                    <div className="text-2xs text-ink-3">{cell.title}</div>
                    <div className="num font-strong">{cell.valueLabel}</div>
                  </>
                }
              >
                <button
                  type="button"
                  aria-label={`${cell.title}: ${cell.valueLabel}`}
                  className={cn("h-5 w-full rounded-xs md:h-6", SEQ_BG[seqStep(cell.value, max)])}
                />
              </Tip>
            ))}
          </div>
        ))}
      </div>
      <SeqScale lowLabel={lowLabel} highLabel={highLabel} />
    </div>
  );
};
