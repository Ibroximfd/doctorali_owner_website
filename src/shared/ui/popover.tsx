"use client";

import { Popover as PopoverPrimitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/shared/lib/cn";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export const PopoverContent = ({
  className,
  align = "start",
  sideOffset = 6,
  ...props
}: ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "bg-surface shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 z-50 min-w-56 rounded-2xl border p-1.5",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
);
