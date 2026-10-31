import Image from "next/image";

import { cn } from "@/shared/lib/cn";

const SIZES = { sm: "size-7 rounded-lg text-2xs", md: "size-9 rounded-xl text-xs" } as const;
const PIXELS = { sm: 28, md: 36 } as const;

type ProductThumbProps = {
  name: string;
  /** Rasm manzili — backend bermasa `null` (savol B-27): o'rnida nom harflari. */
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
};

/** Nomdan ikki harf: «Hapwell-3 (Majun)» → «HA», «Alatoo bals» → «AB». */
export const productInitials = (name: string): string => {
  const words = name
    .replace(/\(.*?\)/g, " ")
    .split(/[\s,-]+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (words.length === 0) return "?";
  const [first = "", second] = words;
  return (second ? `${first[0] ?? ""}${second[0] ?? ""}` : first.slice(0, 2)).toUpperCase();
};

/** Mahsulot rasmi; yo'q bo'lsa — tokenli zaxira (harflar). Nomi yonida turadi, o'zi bezak. */
export const ProductThumb = ({ name, src = null, size = "sm", className }: ProductThumbProps) =>
  src ? (
    <Image
      src={src}
      alt=""
      width={PIXELS[size]}
      height={PIXELS[size]}
      unoptimized
      className={cn("bg-surface-3 shrink-0 object-cover", SIZES[size], className)}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        "bg-accent-soft text-accent grid shrink-0 place-items-center font-semibold",
        SIZES[size],
        className,
      )}
    >
      {productInitials(name)}
    </span>
  );
