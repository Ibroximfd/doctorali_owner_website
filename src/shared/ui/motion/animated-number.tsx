"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number | null | undefined;
  /** Ko'rsatish formati (`formatNumber`, `format.moneyCompact` …). */
  format: (value: number | null | undefined) => string;
  className?: string;
};

/**
 * Raqam oldingi qiymatdan yangisiga "sanab" o'tadi (birinchi chiqishda 0 dan).
 * Ekran o'quvchi va test oxirgi qiymatni ko'radi: animatsiya faqat ko'rinish.
 */
export const AnimatedNumber = ({ value, format, className }: AnimatedNumberProps) => {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<number | null>(reduce || value == null ? (value ?? null) : 0);
  const from = useRef(0);

  useEffect(() => {
    if (value == null) return;
    if (reduce) {
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setShown(latest),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  const final = format(value);
  if (value == null || reduce || shown === value) return <span className={className}>{final}</span>;
  return (
    <span className={className} aria-label={final}>
      <span aria-hidden>{format(Math.round(shown ?? 0))}</span>
    </span>
  );
};
