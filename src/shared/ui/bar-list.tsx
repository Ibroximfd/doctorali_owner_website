import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";
import { formatNumber, formatPercent } from "@/shared/lib/format";

export type BarListItem = {
  key: string;
  label: ReactNode;
  value: number;
  /** Yorliq yonidagi kichik izoh. */
  hint?: string;
  /** Qiymat yonidagi qo'shimcha matn (masalan konversiya). */
  extra?: ReactNode;
  /** Shu qator uchun alohida rang (Tailwind `bg-*` klassi). */
  barClassName?: string;
};

type BarListProps = {
  items: readonly BarListItem[];
  format?: (value: number) => string;
  /** Jamiga nisbatan ulushni ko'rsatish. Qiymatlar qo'shilmaydigan bo'lsa (vaqt, foiz) o'chiring. */
  showShare?: boolean;
  /** Barcha ustunlar rangi. Nominal toifalar bitta rangda — uzunlikning o'zi qiymat. */
  barClassName?: string;
  className?: string;
};

/** Gorizontal ustunlar ro'yxati: har qiymat yozilgan, shuning uchun tooltip shart emas. */
export const BarList = ({
  items,
  format = formatNumber,
  showShare = true,
  barClassName = "bg-series-1",
  className,
}: BarListProps) => {
  const max = Math.max(0, ...items.map((item) => item.value));
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {items.map((item) => (
        <li
          key={item.key}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 text-xs"
        >
          <div className="flex min-w-0 items-center gap-1.5 font-medium">
            <span className="truncate">{item.label}</span>
            {item.hint ? <span className="text-2xs text-ink-3 shrink-0 font-normal">{item.hint}</span> : null}
          </div>
          <div className="num text-right font-semibold whitespace-nowrap">
            {format(item.value)}
            {showShare && total > 0 ? (
              <span className="text-2xs text-ink-3 ml-1.5 font-medium">
                {formatPercent((item.value / total) * 100)}
              </span>
            ) : null}
            {item.extra ? <span className="text-2xs text-ink-3 ml-1.5 font-medium">{item.extra}</span> : null}
          </div>
          <div className="bg-surface-3 col-span-2 h-1.5 overflow-hidden rounded-full">
            {/* kenglik — hisoblangan qiymat (ulush) */}
            <div
              className={cn("h-full min-w-1 rounded-full", item.barClassName ?? barClassName)}
              style={{ width: `${max > 0 ? (item.value / max) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};
