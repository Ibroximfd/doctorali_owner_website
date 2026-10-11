import { Star } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { formatDecimal } from "@/shared/lib/format";

/** O'rtacha baho: yulduz + son. 4 dan past — ogohlantirish rangida. */
export const Rating = ({ value, count }: { value: number; count?: number }) => (
  <span className={cn("num inline-flex items-center gap-1 text-xs font-semibold", value < 4 && "text-crit")}>
    <Star aria-hidden className="fill-series-4 text-series-4 size-3.5" />
    {formatDecimal(value)}
    {count === undefined ? null : <span className="text-ink-3 font-medium">({count})</span>}
  </span>
);
