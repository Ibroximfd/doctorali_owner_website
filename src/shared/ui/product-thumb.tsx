"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/shared/lib/cn";

const SIZES = { sm: "size-7 rounded-lg text-2xs", md: "size-9 rounded-xl text-xs" } as const;
const PIXELS = { sm: 28, md: 36 } as const;

const MEDIA_PREFIX = "/media/";

/**
 * Backend rasm manzili → panel o'qiy oladigan manzil. Backend `/media/…` (nisbiy yoki to'liq
 * URL) — o'z domenimizdagi `/api/media/…` orqali (CSP `img-src 'self'`, nisbiy yo'l esa panel
 * hostiga ketardi). `data:`/`blob:` — o'zi. Boshqa begona manzil — `null` (CSP baribir bloklaydi).
 */
export const mediaUrl = (src: string | null | undefined): string | null => {
  const value = src?.trim();
  if (!value) return null;
  if (value.startsWith("data:image/") || value.startsWith("blob:")) return value;
  if (value.startsWith(MEDIA_PREFIX)) return `/api${value}`;
  try {
    const url = new URL(value);
    return url.pathname.startsWith(MEDIA_PREFIX) ? `/api${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
};

type ProductThumbProps = {
  name: string;
  /** Rasm manzili; yo'q yoki yuklanmasa — nom harflari. */
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
};

/** Nomdan ikki harf: «Hapwell-3 (Majun)» → «H3», «Alatoo bals» → «AB». */
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

/** Mahsulot rasmi; yo'q bo'lsa yoki yuklanmasa (`onError`) — tokenli zaxira (harflar). */
export const ProductThumb = ({ name, src = null, size = "sm", className }: ProductThumbProps) => {
  const url = mediaUrl(src);
  const [failed, setFailed] = useState<string | null>(null);

  if (url && failed !== url)
    return (
      <Image
        src={url}
        alt=""
        width={PIXELS[size]}
        height={PIXELS[size]}
        unoptimized
        onError={() => setFailed(url)}
        className={cn("bg-surface-3 shrink-0 object-cover", SIZES[size], className)}
      />
    );

  return (
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
};
