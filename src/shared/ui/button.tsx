import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/shared/lib/cn";

const button = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-[color,background-color,box-shadow,filter,transform] active:scale-98 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      intent: {
        primary: "bg-accent text-accent-ink shadow-glow shadow-md hover:shadow-lg hover:brightness-110",
        outline: "border border-border-strong bg-surface/40 text-ink hover:bg-surface-3/70",
        ghost: "text-ink-2 hover:bg-surface-3 hover:text-ink",
        // Qaytarib bo'lmaydigan amal (sessiyani uzish) — tasdiqlash tugmasida.
        danger: "bg-crit text-accent-ink hover:brightness-110",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-9 px-3.5 text-sm",
        lg: "h-11 px-4 text-base",
        icon: "size-9",
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
