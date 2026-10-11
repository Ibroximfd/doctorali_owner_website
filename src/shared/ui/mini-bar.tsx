import { cn } from "@/shared/lib/cn";

type MiniBarProps = {
  /** To'ldirish, 0–100 (odatda eng katta qiymatga nisbatan). */
  percent: number;
  /** Tailwind `bg-*` klassi. */
  barClassName?: string;
};

/**
 * Jadval katagidagi son yonidagi kichik ustun — qatorlarni ko'z bilan solishtirish
 * uchun. Qiymat yonida yozilgan, shuning uchun ekran o'quvchidan yashirin;
 * telefondagi kartalarda ko'rsatilmaydi.
 */
export const MiniBar = ({ percent, barClassName = "bg-series-1" }: MiniBarProps) => (
  <span
    aria-hidden
    className="bg-surface-3 ml-2 inline-block h-1.5 w-16 overflow-hidden rounded-full align-middle max-md:hidden"
  >
    {/* kenglik — hisoblangan qiymat */}
    <span
      className={cn("block h-full rounded-full", barClassName)}
      style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
    />
  </span>
);
