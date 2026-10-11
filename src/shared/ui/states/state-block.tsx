import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

type StateBlockProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "neutral" | "crit";
  /** Blok butun sahifa bo'lsa (masalan `/tg`) sarlavha sahifaning `h1` i bo'ladi. */
  titleAs?: "p" | "h1";
  className?: string;
};

/** Bo'sh / natija yo'q / xato / ruxsat yo'q holatlarining umumiy ko'rinishi. */
export const StateBlock = ({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  titleAs: Title = "p",
  className,
}: StateBlockProps) => (
  <div
    className={cn(
      "flex min-h-48 flex-col items-center justify-center gap-1.5 px-4.5 py-7 text-center",
      className,
    )}
  >
    <span
      className={cn(
        "mb-1 grid size-10 place-items-center rounded-lg",
        tone === "crit" ? "bg-crit-soft text-crit" : "bg-surface-3 text-ink-2",
      )}
    >
      <Icon aria-hidden className="size-4.5" />
    </span>
    <Title className="font-strong text-base">{title}</Title>
    {description ? <p className="text-ink-3 max-w-xs text-xs">{description}</p> : null}
    {action ? <div className="mt-2">{action}</div> : null}
  </div>
);
