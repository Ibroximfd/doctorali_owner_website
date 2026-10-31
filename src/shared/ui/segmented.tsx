import { cn } from "@/shared/lib/cn";

type SegmentedProps<Value extends string> = {
  options: readonly { value: Value; label: string }[];
  /** Hech biri tanlanmagan bo'lishi mumkin (masalan boshqa davr tanlangan). */
  value: Value | null;
  onChange: (value: Value) => void;
  ariaLabel: string;
  /** `hero` — to'q yashil bo'lim boshi ustida. */
  tone?: "default" | "hero";
  /** So'rov ketayotganda yoki ko'ruvchi uchun — tanlov ko'rinadi, o'zgartirib bo'lmaydi. */
  disabled?: boolean;
  className?: string;
};

/** Bir nechta variantdan bittasi (davr, til). */
export const Segmented = <Value extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  tone = "default",
  disabled = false,
  className,
}: SegmentedProps<Value>) => (
  <div
    role="group"
    aria-label={ariaLabel}
    className={cn(
      "inline-flex gap-1 rounded-xl border p-1",
      tone === "hero" ? "bg-hero-ink/5" : "bg-surface-2/60",
      className,
    )}
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        aria-pressed={option.value === value}
        disabled={disabled}
        onClick={() => onChange(option.value)}
        className={cn(
          "h-7.5 rounded-lg px-3 text-xs font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed",
          option.value === value
            ? "bg-accent-soft text-accent"
            : tone === "hero"
              ? "text-hero-ink-2 hover:text-hero-ink"
              : "text-ink-2 hover:text-ink",
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);
