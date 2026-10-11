import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

export type KvRow = { key: string; label: ReactNode; value: ReactNode; hint?: string; indent?: boolean };

/** Yorliq → qiymat ro'yxati (tafsilot kartalari, yig'ma ko'rsatkichlar). */
export const KvList = ({ rows, className }: { rows: readonly KvRow[]; className?: string }) => (
  <dl className={cn("flex flex-col", className)}>
    {rows.map((row) => (
      <div
        key={row.key}
        className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-b-0"
      >
        <dt className={cn("text-ink-2 flex min-w-0 items-center gap-2", row.indent && "text-ink-3 pl-4")}>
          {row.label}
        </dt>
        <dd className="text-right font-semibold whitespace-nowrap tabular-nums">
          {row.value}
          {row.hint ? <span className="text-2xs text-ink-3 ml-1.5 font-medium">{row.hint}</span> : null}
        </dd>
      </div>
    ))}
  </dl>
);
