import { SEQ_BG } from "@/shared/config/chart-palette";
import { cn } from "@/shared/lib/cn";

/** Ketma-ket shkala izohi: "kam … ko'p". */
export const SeqScale = ({
  lowLabel,
  highLabel,
  className,
}: {
  lowLabel: string;
  highLabel: string;
  className?: string;
}) => (
  <div className={cn("text-2xs text-ink-3 mt-3 flex items-center gap-1.5", className)}>
    <span>{lowLabel}</span>
    {SEQ_BG.map((step) => (
      <span key={step} aria-hidden className={cn("h-2.5 w-5.5 rounded-xs", step)} />
    ))}
    <span>{highLabel}</span>
  </div>
);
