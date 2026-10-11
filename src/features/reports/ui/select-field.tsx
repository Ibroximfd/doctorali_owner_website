import { cn } from "@/shared/lib/cn";

type SelectFieldProps<Value extends string> = {
  /** `select` ning `id` si — yorliq shu bilan bog'lanadi. */
  id: string;
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
  className?: string;
};

/** Yorliqli tanlov maydoni. Brauzerning o'z `select` i: klaviatura va telefon tanlagichi bilan birga keladi. */
export const SelectField = <Value extends string>({
  id,
  label,
  value,
  options,
  onChange,
  className,
}: SelectFieldProps<Value>) => (
  <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
    <label htmlFor={id} className="font-mid text-ink-2 text-xs">
      {label}
    </label>
    <select
      id={id}
      value={value}
      onChange={(event) => {
        const next = options.find((option) => option.value === event.target.value);
        if (next) onChange(next.value);
      }}
      className="border-border-strong bg-surface h-8.5 w-full min-w-0 rounded-md border px-2.5 text-sm"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);
