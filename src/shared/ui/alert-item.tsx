import { Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { Alert, AlertSeverity } from "@/shared/domain/alert";
import { cn } from "@/shared/lib/cn";

const SEVERITY: Record<AlertSeverity, { icon: LucideIcon; className: string }> = {
  critical: { icon: OctagonAlert, className: "bg-crit-soft text-crit" },
  serious: { icon: TriangleAlert, className: "bg-serious-soft text-serious" },
  moderate: { icon: Info, className: "bg-warn-soft text-warn" },
};

type AlertItemProps = {
  alert: Alert;
  /** "3 soat oldin" kabi nisbiy vaqt (formatlash chaqiruvchida). */
  age: string;
  /** Matn ostidagi amallar (Ko'rish, Ko'rildi). */
  actions?: ReactNode;
  className?: string;
};

/** Bitta signal qatori: daraja ikon + rangda, sarlavha, tafsilot, yoshi. */
export const AlertItem = ({ alert, age, actions, className }: AlertItemProps) => {
  const t = useTranslations("common.severity");
  const { icon: Icon, className: tone } = SEVERITY[alert.severity];

  return (
    <div className={cn("flex items-start gap-2.5 px-3.5 py-2.5 md:px-4.5", className)}>
      <span
        title={t(alert.severity)}
        className={cn("grid size-7 shrink-0 place-items-center rounded-md", tone)}
      >
        <Icon aria-hidden className="size-4" strokeWidth={2} />
        <span className="sr-only">{t(alert.severity)}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-semibold">{alert.title}</p>
        <p className="text-ink-3 mt-0.5 text-xs leading-snug">
          {alert.filial ? `${alert.filial} · ` : null}
          {alert.body}
        </p>
        {actions ? <div className="mt-2 flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <span className="text-2xs text-ink-3 shrink-0 pt-0.5 whitespace-nowrap">{age}</span>
    </div>
  );
};
