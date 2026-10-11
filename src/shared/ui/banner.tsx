import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

type BannerProps = { icon?: LucideIcon; children: ReactNode; action?: ReactNode; className?: string };

/** Neytral axborot tasmasi (oflayn, eskirgan ma'lumot, izoh). Xato emas — qizil ishlatilmaydi. */
export const Banner = ({ icon: Icon, children, action, className }: BannerProps) => (
  <div
    className={cn(
      "bg-surface-3 text-ink-2 flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm",
      className,
    )}
  >
    {Icon ? <Icon aria-hidden className="size-4 shrink-0" /> : null}
    <div className="min-w-0 flex-1">{children}</div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);
