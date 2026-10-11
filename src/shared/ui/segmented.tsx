import { cn } from "@/shared/lib/cn";

type SegmentedProps<Value extends string> = {
  options: readonly { value: Value; label: string }[];
  /** Hech biri tanlanmagan bo'lishi mumkin (masalan boshqa davr tanlangan). */
  value: Value | null;
  onChange: (value: Value) => void;
  ariaLabel: string;
  className?: string;
};

/** Bir nechta variantdan bittasi (davr, til). */
export const Segmented = <Value extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedProps<Value>) => (
  <div
    role="group"
    aria-label={ariaLabel}
    className={cn("bg-surface-3 inline-flex gap-0.5 rounded-md p-0.5", className)}
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        aria-pressed={option.value === value}
        onClick={() => onChange(option.value)}
        className={cn(
          "font-mid h-7 rounded-sm px-2.5 text-xs whitespace-nowrap transition-colors",
          option.value === value ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink",
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);
