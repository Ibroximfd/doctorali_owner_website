"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/** Yumshoq "ko'tarilish" egri chizig'i — butun panelda bitta. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE_OUT } },
};

type Props = { children: ReactNode; className?: string };

/**
 * Bloklar ketma-ket paydo bo'ladi (sahifa ochilganda bir marta). Harakat
 * kamaytirilgan bo'lsa — darhol, animatsiyasiz.
 */
export const Stagger = ({ children, className }: Props) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="shown"
    >
      {children}
    </motion.div>
  );
};

/** `Stagger` ichidagi bitta bo'lak. Tashqarisida ham ishlaydi (o'zi paydo bo'ladi). */
export const StaggerItem = ({ children, className }: Props) => (
  <motion.div className={className} variants={item}>
    {children}
  </motion.div>
);

/** Ekranga kirganda bir marta paydo bo'ladigan blok (pastdagi kartalar uchun). */
export const Reveal = ({ children, className, delay = 0 }: Props & { delay?: number }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
};
