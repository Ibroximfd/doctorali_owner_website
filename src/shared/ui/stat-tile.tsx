import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

import { MetricDelta } from "./metric-delta";
import { Sparkline } from "./sparkline";

type StatTileProps = {
  label: string;
  /** Allaqachon formatlangan qiymat (`3 860`, `85,7%`). */
  value: ReactNode;
  unit?: string;
  delta?: number | null;
  /** O'sish yomon bo'lgan ko'rsatkich (atkaz, xarajat, vaqt). */
  invertDelta?: boolean;
  deltaUnit?: "pct" | "pp";
  note?: string;
  sparkline?: readonly number[];
  className?: string;
};

/** Bitta raqam — grafik emas: yorliq, qiymat, o'zgarish, mini trend. */
export const StatTile = ({
  label,
  value,
  unit,
  delta,
  invertDelta,
  deltaUnit,
  note,
  sparkline,
  className,
}: StatTileProps) => (
  <div
    className={cn(
      "bg-surface flex min-w-0 flex-col gap-1.5 rounded-lg border px-3 py-2.5 md:px-3.5 md:py-3",
      className,
    )}
  >
    <div className="text-ink-2 truncate text-xs font-medium">{label}</div>
    <div className="font-strong md:text-kpi text-xl leading-none tracking-tight whitespace-nowrap">
      {value}
      {unit ? <span className="text-ink-3 ml-1 text-xs font-medium tracking-normal">{unit}</span> : null}
    </div>
    <div className="flex min-h-6.5 items-end justify-between gap-1.5">
      <div className="min-w-0 flex-1">
        <MetricDelta value={delta} invert={invertDelta} unit={deltaUnit} />
        {note ? <div className="text-2xs text-ink-3 mt-1 leading-tight">{note}</div> : null}
      </div>
      {sparkline ? <Sparkline values={sparkline} className="w-14 shrink-0 md:w-18" /> : null}
    </div>
  </div>
);

/** KPI qatori: telefonda 2, planshetda 3, desktopda 6 (yoki 4) ustun. */
export const StatRow = ({ children, columns = 6 }: { children: ReactNode; columns?: 4 | 6 }) => (
  <div
    className={cn(
      "mb-4 grid grid-cols-2 gap-2.5 md:gap-3",
      columns === 6 ? "md:grid-cols-3 xl:grid-cols-6" : "xl:grid-cols-4",
    )}
  >
    {children}
  </div>
);
