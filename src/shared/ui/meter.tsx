import { cn } from "@/shared/lib/cn";

type MeterProps = {
  /** To'ldirish, 0–100. */
  value: number;
  /** Ixtiyoriy belgi (kutilgan daraja / maqsad), 0–100. */
  marker?: number;
  tone?: "accent" | "warn" | "crit";
  ariaLabel: string;
  className?: string;
};

const TRACK = { accent: "bg-accent-soft", warn: "bg-warn-soft", crit: "bg-crit-soft" } as const;
const FILL = { accent: "bg-accent", warn: "bg-warn", crit: "bg-crit" } as const;

const clamp = (value: number): number => Math.max(0, Math.min(100, value));

/** Chegaraga nisbatan bitta nisbat. Yo'l — to'ldirish rangining och qadami. */
export const Meter = ({ value, marker, tone = "accent", ariaLabel, className }: MeterProps) => (
  <div
    role="meter"
    aria-label={ariaLabel}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(clamp(value))}
    className={cn("relative h-2 rounded-full", TRACK[tone], className)}
  >
    {/* kenglik va joylashuv — hisoblangan qiymat */}
    <div
      className={cn("absolute inset-y-0 left-0 min-w-1 rounded-full", FILL[tone])}
      style={{ width: `${clamp(value)}%` }}
    />
    {marker === undefined ? null : (
      <div
        aria-hidden
        className="bg-ink absolute -inset-y-1 w-0.5 rounded-full"
        style={{ left: `${clamp(marker)}%` }}
      />
    )}
  </div>
);
