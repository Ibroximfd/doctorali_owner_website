import { ArrowDown } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";
import { formatNumber, formatPercent } from "@/shared/lib/format";

export type FunnelStep = {
  key: string;
  label: string;
  count: number;
  /** Son ostidagi ikkinchi qator (summa yoki ulush). Berilmasa — birinchi qadamga nisbatan ulush. */
  secondary?: string;
  /** Tailwind `bg-*` klassi (nuqta va ustun uchun). */
  colorClassName: string;
};

type FunnelProps = {
  steps: readonly FunnelStep[];
  /** Qadamlar orasidagi yozuv: `92,9% o'tdi`. */
  renderTransition: (passedPercent: string, lost: number) => ReactNode;
  className?: string;
};

/** Voronka: har qadamning ustuni birinchi qadamga nisbatan; oralarida o'tish foizi. */
export const Funnel = ({ steps, renderTransition, className }: FunnelProps) => {
  const first = steps[0]?.count ?? 0;

  return (
    <ol className={cn("flex flex-col gap-1", className)}>
      {steps.map((step, index) => {
        const previous = index > 0 ? steps[index - 1] : undefined;
        // Keyingi qadam oldingisidan katta bo'lishi mumkin (masalan ochilgan > yuborilgan) — ustun 100% dan oshmaydi.
        const width = first > 0 ? Math.min(100, (step.count / first) * 100) : 0;
        return (
          <li key={step.key}>
            {previous ? (
              <div className="text-2xs text-ink-3 flex h-5 items-center gap-1.5 md:pl-46">
                <ArrowDown aria-hidden className="size-3.5" />
                {renderTransition(
                  formatPercent(previous.count > 0 ? (step.count / previous.count) * 100 : 0),
                  Math.max(0, previous.count - step.count),
                )}
              </div>
            ) : null}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 md:grid-cols-[10.75rem_minmax(0,1fr)_8rem]">
              <div className="font-mid flex min-w-0 items-center gap-2 text-sm">
                <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", step.colorClassName)} />
                <span className="truncate" title={step.label}>
                  {step.label}
                </span>
              </div>
              <div className="bg-surface-3 col-span-2 row-start-2 h-3 overflow-hidden rounded-sm md:col-span-1 md:row-start-auto md:h-7.5">
                {/* kenglik — hisoblangan qiymat (birinchi qadamga nisbatan) */}
                <div
                  className={cn("h-full min-w-1 rounded-sm", step.colorClassName)}
                  style={{ width: `${width}%` }}
                />
              </div>
              <div className="text-right leading-tight whitespace-nowrap">
                <div className="num font-strong text-base">{formatNumber(step.count)}</div>
                <div className="num text-2xs text-ink-3 font-medium">
                  {step.secondary ?? formatPercent(width)}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
};
