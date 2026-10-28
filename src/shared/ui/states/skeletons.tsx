import { cn } from "@/shared/lib/cn";

/** Skeletonlar haqiqiy kontent shaklida — ma'lumot kelganda joylashuv sakramaydi. */

const Bone = ({ className }: { className?: string }) => (
  <div aria-hidden className={cn("skeleton", className)} />
);

export const StatRowSkeleton = ({ count = 6 }: { count?: 4 | 6 }) => (
  <div
    aria-busy="true"
    className={cn(
      "mb-4 grid grid-cols-2 gap-2.5 md:gap-3",
      count === 6 ? "md:grid-cols-3 xl:grid-cols-6" : "xl:grid-cols-4",
    )}
  >
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="panel-surface flex flex-col gap-2 rounded-2xl border px-4 py-3.5">
        <Bone className="h-3 w-3/5" />
        <Bone className="h-6 w-4/5" />
        <Bone className="h-4 w-2/5" />
      </div>
    ))}
  </div>
);

const BAR_HEIGHTS = [
  "h-14",
  "h-20",
  "h-12",
  "h-28",
  "h-24",
  "h-32",
  "h-20",
  "h-30",
  "h-36",
  "h-24",
  "h-32",
  "h-22",
] as const;

export const ChartSkeleton = ({ className }: { className?: string }) => (
  <div aria-busy="true" className={cn("flex h-56 items-end gap-2.5", className)}>
    {BAR_HEIGHTS.map((height, index) => (
      <Bone key={index} className={cn("flex-1", height)} />
    ))}
  </div>
);

export const ListSkeleton = ({ rows = 5, className }: { rows?: number; className?: string }) => (
  <div aria-busy="true" className={cn("flex flex-col gap-3", className)}>
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="flex flex-col gap-1.5">
        <div className="flex justify-between gap-6">
          <Bone className="h-3.5 w-2/5" />
          <Bone className="h-3.5 w-14" />
        </div>
        <Bone className="h-1.5 w-full" />
      </div>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 6, className }: { rows?: number; className?: string }) => (
  <div aria-busy="true" className={cn("flex flex-col px-4.5", className)}>
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="flex items-center gap-4 border-b py-3 last:border-b-0">
        <Bone className="h-4 w-1/4" />
        <Bone className="h-4 flex-1" />
        <Bone className="h-4 w-16" />
        <Bone className="h-4 w-12 max-md:hidden" />
      </div>
    ))}
  </div>
);

export const BlockSkeleton = ({ className }: { className?: string }) => (
  <Bone className={cn("h-40 w-full", className)} />
);
