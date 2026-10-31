import { cn } from "@/shared/lib/cn";
import { formatNumber, formatPercent } from "@/shared/lib/format";

export type StackedBarItem = { key: string; label: string; value: number; colorClassName: string };

type StackedBarProps = {
  items: readonly StackedBarItem[];
  ariaLabel: string;
  format?: (value: number) => string;
  /** `row` — yonma-yon, `column` — ro'yxat, `block` — katta raqamli bloklar. */
  legend?: "row" | "column" | "block";
  className?: string;
};

/**
 * Butunning qismlari: bitta gorizontal ustun + har qiymati yozilgan legend.
 * Bo'laklar orasida 2px bo'shliq — chegara chizilmaydi.
 */
export const StackedBar = ({
  items,
  ariaLabel,
  format = formatNumber,
  legend = "row",
  className,
}: StackedBarProps) => {
  const visible = items.filter((item) => item.value > 0);
  const total = visible.reduce((sum, item) => sum + item.value, 0);
  const share = (value: number) => (total > 0 ? formatPercent((value / total) * 100) : formatPercent(0));

  return (
    <div className={className}>
      <div role="img" aria-label={ariaLabel} className="flex h-3.5 gap-0.5 overflow-hidden rounded-sm">
        {visible.map((item) => (
          // flex-grow — hisoblangan qiymat (ulush)
          <div
            key={item.key}
            className={cn("min-w-1 rounded-xs", item.colorClassName)}
            style={{ flexGrow: item.value }}
          />
        ))}
      </div>

      {legend === "block" ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
          {visible.map((item) => (
            <div key={item.key} className="min-w-0">
              <dt className="text-ink-2 flex items-center gap-1.5 text-xs">
                <span aria-hidden className={cn("size-2.5 shrink-0 rounded-xs", item.colorClassName)} />
                <span className="truncate">{item.label}</span>
              </dt>
              <dd className="font-strong mt-0.5 text-lg tracking-tight whitespace-nowrap">
                {format(item.value)}{" "}
                {/* son va ulush matnda ham ajralib tursin (o'qish, nusxa, ekran o'quvchi) */}
                <span className="num text-2xs text-ink-3 ml-1 font-medium tracking-normal">
                  ({share(item.value)})
                </span>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <ul
          className={cn("mt-3", legend === "column" ? "flex flex-col" : "grid grid-cols-2 gap-x-4 gap-y-2")}
        >
          {visible.map((item) => (
            <li
              key={item.key}
              className={cn(
                "flex min-w-0 items-center gap-2 text-xs",
                legend === "column" && "border-b py-1.5 last:border-b-0",
              )}
            >
              <span aria-hidden className={cn("size-2.5 shrink-0 rounded-xs", item.colorClassName)} />
              <span className="text-ink-2 truncate">{item.label}</span>
              <span className="num ml-auto font-semibold whitespace-nowrap">{format(item.value)}</span>
              <span className="num text-2xs text-ink-3 w-11 shrink-0 text-right font-medium">
                {share(item.value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
