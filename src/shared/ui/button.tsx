import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/shared/lib/cn";

const button = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-mid whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      intent: {
        primary: "bg-accent text-accent-ink hover:brightness-110",
        outline: "border border-border-strong bg-surface text-ink hover:bg-surface-2",
        ghost: "text-ink-2 hover:bg-surface-3 hover:text-ink",
        // Qaytarib bo'lmaydigan amal (sessiyani uzish) — tasdiqlash tugmasida.
        danger: "bg-crit text-surface hover:brightness-110",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-8.5 px-3 text-sm",
        lg: "h-11 px-4 text-base",
        icon: "size-8.5",
      },
    },
    defaultVariants: { intent: "outline", size: "md" },
  },
);

type ButtonProps = ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof button> & {
    /** Bolani (masalan `<Link>`) tugma ko'rinishida chizadi. */
    asChild?: boolean;
  };

export const Button = ({ className, intent, size, asChild = false, type, ...props }: ButtonProps) => {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      className={cn(button({ intent, size }), className)}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    />
  );
};
