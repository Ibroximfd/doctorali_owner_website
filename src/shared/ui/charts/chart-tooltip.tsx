import { cn } from "@/shared/lib/cn";

type TooltipEntry = { dataKey?: unknown; name?: unknown; value?: unknown; color?: string };

type ChartTooltipProps = {
  active?: boolean;
  label?: unknown;
  payload?: readonly TooltipEntry[];
  formatValue: (value: number) => string;
  totalLabel?: string;
  /** Belgi shakli: chiziq grafikda — chiziqcha, ustunda — kvadrat. */
  marker: "line" | "box";
};

/** Bitta tooltip — shu nuqtadagi barcha seriyalar; qiymat urg'uda, nom ikkinchi darajada. */
export const ChartTooltip = ({
  active,
  label,
  payload,
  formatValue,
  totalLabel,
  marker,
}: ChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  // Bitta seriya ikki marta kelishi mumkin (maydon + chiziq) — har seriya bir marta, jami ham ikki baravar bo'lmasin.
  const seen = new Set<string>();
  const rows = payload.filter((entry): entry is TooltipEntry & { value: number } => {
    const key = String(entry.dataKey);
    if (typeof entry.value !== "number" || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const total = rows.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="bg-surface shadow-pop min-w-40 rounded-xl border px-3.5 py-2.5 text-xs">
      <div className="text-2xs text-ink-3 mb-1.5 font-semibold">{String(label ?? "")}</div>
      {rows.map((entry) => (
        <div key={String(entry.dataKey)} className="flex items-center gap-2 py-0.5">
          {/* rang — seriyaning o'z tokeni (hisoblangan qiymat) */}
          <span
            aria-hidden
            className={cn("shrink-0 rounded-full", marker === "line" ? "h-0.5 w-3" : "size-2 rounded-xs")}
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-ink-2 whitespace-nowrap">{String(entry.name ?? "")}</span>
          <span className="num font-strong ml-auto pl-3.5 whitespace-nowrap">{formatValue(entry.value)}</span>
        </div>
      ))}
      {totalLabel && rows.length > 1 ? (
        <div className="mt-1.5 flex items-center gap-2 border-t pt-1.5">
          <span className="text-ink-2">{totalLabel}</span>
          <span className="num font-strong ml-auto pl-3.5 whitespace-nowrap">{formatValue(total)}</span>
        </div>
      ) : null}
    </div>
  );
};
