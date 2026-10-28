import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

type ChipProps = Omit<ComponentPropsWithoutRef<"button">, "children"> & {
  pressed: boolean;
  children: ReactNode;
  count?: number;
  size?: "sm" | "lg";
};

/** Almashtiruvchi filtr tugmasi (holat `aria-pressed` da). */
export const Chip = ({ pressed, children, count, size = "sm", className, ...props }: ChipProps) => (
  <button
    type="button"
    aria-pressed={pressed}
    className={cn(
      "font-mid inline-flex shrink-0 items-center gap-1.5 rounded-full border whitespace-nowrap transition-colors",
      size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
      pressed
        ? "border-accent/40 bg-accent-soft text-accent"
        : "border-border-strong bg-surface/40 text-ink-2 hover:text-ink",
      className,
    )}
    {...props}
  >
    {children}
    {count === undefined ? null : <span className="num text-2xs opacity-75">{count}</span>}
  </button>
);
