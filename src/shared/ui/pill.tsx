import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

const pill = cva(
  "inline-flex h-5.5 items-center gap-1 rounded-sm px-2 text-2xs font-semibold whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      intent: {
        good: "bg-good-soft text-good",
        warn: "bg-warn-soft text-warn",
        serious: "bg-serious-soft text-serious",
        crit: "bg-crit-soft text-crit",
        info: "bg-info-soft text-info",
        neutral: "bg-surface-3 text-ink-2",
      },
    },
    defaultVariants: { intent: "neutral" },
  },
);

export type PillIntent = NonNullable<VariantProps<typeof pill>["intent"]>;

type PillProps = { intent?: PillIntent; icon?: LucideIcon; children: ReactNode; className?: string };

/** Holat belgisi: rang hech qachon yolg'iz emas — har doim matn (va odatda ikon) bilan. */
export const Pill = ({ intent, icon: Icon, children, className }: PillProps) => (
  <span className={cn(pill({ intent }), className)}>
    {Icon ? <Icon aria-hidden strokeWidth={2.2} /> : null}
    {children}
  </span>
);
