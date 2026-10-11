"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/shared/lib/cn";

/** Yoqish/o'chirish. `aria-label` yoki bog'langan `<label>` majburiy. */
export const Switch = ({ className, ...props }: ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) => (
  <SwitchPrimitive.Root
    className={cn(
      "bg-border-strong data-[state=checked]:bg-accent relative h-5 w-9 shrink-0 rounded-full transition-colors",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="bg-surface block size-4 translate-x-0.5 rounded-full shadow-sm transition-transform data-[state=checked]:translate-x-4.5" />
  </SwitchPrimitive.Root>
);
