import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

/**
 * Sahifa to'ri: telefonda 1 ustun, planshetda 2, desktopda 12.
 * Bolalar `span.*` bilan kenglik oladi.
 */
export const Grid = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-12", className)}>
    {children}
  </div>
);

/** Kenglik: `half*` — planshetda yarim, qolganlari planshetda to'liq qator. */
export const span = {
  full: "md:col-span-2 xl:col-span-12",
  c8: "md:col-span-2 xl:col-span-8",
  c7: "md:col-span-2 xl:col-span-7",
  c6: "md:col-span-2 xl:col-span-6",
  c5: "md:col-span-2 xl:col-span-5",
  c4: "md:col-span-2 xl:col-span-4",
  half6: "md:col-span-1 xl:col-span-6",
  half4: "md:col-span-1 xl:col-span-4",
} as const;
