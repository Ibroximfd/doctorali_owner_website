import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

/**
 * Karta — «instrument» paneli: yuqoridan xira yorug'lik, 1px nozik chegara, soyasiz.
 * Soya faqat qalqib chiquvchilarda.
 */
export const Card = ({ className, ...props }: ComponentPropsWithoutRef<"section">) => (
  <section className={cn("panel-surface flex min-w-0 flex-col rounded-3xl border", className)} {...props} />
);

type CardHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** O'ng tomon: havola, ko'rinish almashtirgich, belgi. */
  action?: ReactNode;
  className?: string;
};

export const CardHeader = ({ title, description, action, className }: CardHeaderProps) => (
  <div className={cn("flex items-start gap-2.5 px-4 pt-4 md:px-5.5 md:pt-5", className)}>
    <div className="min-w-0">
      <h2 className="font-display text-display">{title}</h2>
      {description ? <p className="text-ink-3 mt-1 text-xs">{description}</p> : null}
    </div>
    {action ? <div className="ml-auto flex shrink-0 items-center gap-1.5">{action}</div> : null}
  </div>
);

type CardBodyProps = ComponentPropsWithoutRef<"div"> & {
  /** Jadval va ro'yxatlar uchun yon bo'shliqsiz. */
  flush?: boolean;
};

export const CardBody = ({ className, flush = false, ...props }: CardBodyProps) => (
  <div
    className={cn(
      "min-w-0 flex-1",
      flush ? "pt-2 pb-1.5" : "px-4 pt-3 pb-4 md:px-5.5 md:pt-4 md:pb-5.5",
      className,
    )}
    {...props}
  />
);
