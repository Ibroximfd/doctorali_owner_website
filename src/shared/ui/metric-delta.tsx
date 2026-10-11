import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { formatDecimal } from "@/shared/lib/format";

type MetricDeltaProps = {
  /** Oldingi davrga nisbatan o'zgarish. `null` — taqqoslash yo'q, hech narsa chizilmaydi. */
  value: number | null | undefined;
  /** O'sish yomon bo'lgan ko'rsatkichlar (atkaz, xarajat, vaqt). */
  invert?: boolean;
  /** `pp` — foiz punkti (ulushlar farqi). */
  unit?: "pct" | "pp";
  className?: string;
};

const FLAT_THRESHOLD = 0.05;

/** O'zgarish belgisi: yo'nalish ikonda, yaxshi/yomon rangda, qiymat matnda. */
export const MetricDelta = ({ value, invert = false, unit = "pct", className }: MetricDeltaProps) => {
  const t = useTranslations("common.delta");
  if (value === null || value === undefined) return null;

  const isFlat = Math.abs(value) < FLAT_THRESHOLD;
  const isUp = value > 0;
  const isGood = invert ? !isUp : isUp;
  const Icon = isUp ? ArrowUp : ArrowDown;
  const suffix = unit === "pp" ? ` ${t("pp")}` : "%";

  return (
    <span
      className={cn(
        "num text-2xs inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 font-semibold whitespace-nowrap",
        isFlat ? "bg-surface-3 text-ink-3" : isGood ? "bg-good-soft text-good" : "bg-crit-soft text-crit",
        className,
      )}
    >
      {isFlat ? null : <Icon aria-hidden className="size-3" strokeWidth={2.6} />}
      <span className="sr-only">{isFlat ? t("flat") : isUp ? t("up") : t("down")}</span>
      {formatDecimal(Math.abs(value))}
      {suffix}
    </span>
  );
};
