"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Element o'lchami (px) — SVG grafik matnni cho'zmasdan to'g'ri o'lchamda chizishi uchun.
 * O'lchab bo'lmaguncha (`jsdom`, birinchi kadr) `fallback` qaytadi.
 */
export const useElementSize = <T extends HTMLElement>(fallback: { width: number; height: number }) => {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(fallback);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setSize((current) =>
          current.width === Math.round(width) && current.height === Math.round(height)
            ? current
            : { width: Math.round(width), height: Math.round(height) },
        );
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
};
