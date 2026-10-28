"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { EASE_OUT } from "./motion/reveal";

type PageHeaderProps = { title: string; description?: ReactNode; actions?: ReactNode };

/**
 * Har sahifada bitta `h1` — Fraunces tahririy sarlavha, xiralikdan ochilib kiradi
 * (`SectionHero` ning ixcham varianti: illyustratsiya va raqamlarsiz).
 */
export const PageHeader = ({ title, description, actions }: PageHeaderProps) => {
  const reduce = useReducedMotion();

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 pt-1 md:mb-6 md:pt-2">
      <div className="min-w-0">
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="font-display text-3xl leading-tight md:text-4xl"
        >
          {title}
        </motion.h1>
        {description ? <p className="text-ink-3 mt-1.5 text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-2 md:ml-auto md:w-auto">{actions}</div> : null}
    </div>
  );
};
