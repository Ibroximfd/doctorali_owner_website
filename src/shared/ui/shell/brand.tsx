import Image from "next/image";

import { cn } from "@/shared/lib/cn";

/** Brend belgisi — Doctor Ali rasmiy logosi (`public/brand/`). O'lchami `className` bilan beriladi. */
export const BrandMark = ({ className }: { className?: string }) => (
  <span className={cn("relative block size-8 shrink-0 overflow-hidden rounded-md", className)}>
    <Image src="/brand/doctor-ali-192.png" alt="Doctor Ali" fill sizes="96px" priority />
  </span>
);
