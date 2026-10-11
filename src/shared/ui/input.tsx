import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

// React 19: `ref` oddiy prop — forma kutubxonalari (Controller) uni to'g'ridan uzatadi.
export const Input = ({ className, ...props }: ComponentProps<"input">) => (
  <input
    className={cn(
      "border-border-strong bg-surface placeholder:text-ink-3 h-9.5 w-full min-w-0 rounded-md border px-3 text-base transition-[border-color,box-shadow]",
      // Fokus — bitta rang: umumiy fokus chizig'i o'rniga chegara + yumshoq halqa.
      // Xato holatida faqat qizil (qizil chegara ustida yashil chiziq chiqmasin).
      "focus-visible:border-accent focus-visible:ring-accent/25 focus-visible:ring-3 focus-visible:outline-none",
      "aria-invalid:border-crit aria-invalid:focus-visible:border-crit aria-invalid:focus-visible:ring-crit/25",
      className,
    )}
    {...props}
  />
);

type FieldProps = {
  /** Input `id` si — `<label htmlFor>` va xato matni shu bilan bog'lanadi. */
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

/** Yorliq + maydon + xato. Xato `aria-describedby` uchun `${id}-error` id bilan chiqadi. */
export const Field = ({ id, label, error, children, className }: FieldProps) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    <label htmlFor={id} className="font-mid text-ink-2 text-xs">
      {label}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} role="alert" className="text-crit text-xs">
        {error}
      </p>
    ) : null}
  </div>
);
