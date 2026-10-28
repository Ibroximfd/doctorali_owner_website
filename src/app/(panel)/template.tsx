"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Bo'limlar orasida o'tish: yangi sahifa yumshoq ko'tarilib chiqadi (`template` har o'tishda qayta quriladi). */
export default function PanelTemplate({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
