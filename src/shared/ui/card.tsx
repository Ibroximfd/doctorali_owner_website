import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

/** Karta — 1px chegara, soyasiz. Soya faqat qalqib chiquvchilarda. */
export const Card = ({ className, ...props }: ComponentPropsWithoutRef<"section">) => (
  <section className={cn("bg-surface flex min-w-0 flex-col rounded-xl border", className)} {...props} />
);

type CardHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** O'ng tomon: havola, ko'rinish almashtirgich, belgi. */
  action?: ReactNode;
  className?: string;
};

export const CardHeader = ({ title, description, action, className }: CardHeaderProps) => (
  <div className={cn("flex items-start gap-2.5 px-3.5 pt-3.5 md:px-4.5 md:pt-4", className)}>
    <div className="min-w-0">
      <h2 className="font-strong text-base leading-tight">{title}</h2>
      {description ? <p className="text-ink-3 mt-0.5 text-xs">{description}</p> : null}
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
      flush ? "pt-2 pb-1.5" : "px-3.5 pt-3 pb-3.5 md:px-4.5 md:pt-3.5 md:pb-4.5",
      className,
    )}
    {...props}
  />
);
