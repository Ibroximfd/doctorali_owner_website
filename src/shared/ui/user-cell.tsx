import { cn } from "@/shared/lib/cn";
import { initialsOf } from "@/shared/lib/format";

export const Avatar = ({ name, className }: { name: string; className?: string }) => (
  <span
    aria-hidden
    className={cn(
      "bg-surface-3 text-2xs font-strong text-ink-2 grid size-6.5 shrink-0 place-items-center rounded-full",
      className,
    )}
  >
    {initialsOf(name)}
  </span>
);

type UserCellProps = { name: string; subtitle?: string; online?: boolean; rank?: number };

/** Jadvaldagi shaxs: avatar + ism + izoh (+ onlayn nuqtasi, tartib raqami). */
export const UserCell = ({ name, subtitle, online, rank }: UserCellProps) => (
  <div className="flex min-w-0 items-center gap-2">
    {rank === undefined ? null : (
      <span className="num text-ink-3 w-4.5 shrink-0 text-xs font-semibold">{rank}</span>
    )}
    <Avatar name={name} />
    <div className="min-w-0 leading-tight">
      <div className="truncate font-semibold">{name}</div>
      {subtitle ? (
        <div className="text-2xs text-ink-3 flex items-center gap-1">
          {online === undefined ? null : (
            <span aria-hidden className={cn("size-1.5 rounded-full", online ? "bg-good" : "bg-ink-3")} />
          )}
          <span className="truncate">{subtitle}</span>
        </div>
      ) : null}
    </div>
  </div>
);
