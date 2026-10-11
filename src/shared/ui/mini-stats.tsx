import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

export type MiniStat = { key: string; label: string; value: ReactNode; unit?: string; note?: ReactNode };

/** Karta ichidagi kichik ko'rsatkichlar (2–4 ta yonma-yon). */
export const MiniStats = ({ items, className }: { items: readonly MiniStat[]; className?: string }) => (
  <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]", className)}>
    {items.map((item) => (
      <div key={item.key} className="bg-surface-2 min-w-0 rounded-lg border px-3 py-2.5">
        <div className="text-2xs text-ink-3 truncate">{item.label}</div>
        <div className="font-strong mt-0.5 text-lg tracking-tight whitespace-nowrap">
          {item.value}
          {item.unit ? (
            <span className="text-2xs text-ink-3 ml-1 font-medium tracking-normal">{item.unit}</span>
          ) : null}
        </div>
        {item.note ? <div className="text-2xs text-ink-3 mt-0.5">{item.note}</div> : null}
      </div>
    ))}
  </div>
);
