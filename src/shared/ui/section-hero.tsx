"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent, ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

import { EASE_OUT } from "./motion/reveal";

type SectionHeroProps = {
  /** Jonli nuqta yonidagi qisqa holat qatori: «Ombor · qoldiqlar». */
  eyebrow: string;
  title: string;
  description?: ReactNode;
  /** O'ng tomondagi chizilgan illyustratsiya (`shared/ui/illustrations`). */
  art: ReactNode;
  /** Sarlavha ostida — jonli raqamlar (`HeroStat`) yoki amallar. */
  children?: ReactNode;
};

/** Sichqoncha siljishiga illyustratsiya qanchalik ergashadi (px). */
const PARALLAX = 14;

/**
 * Bo'lim boshi — «tahririy» sarlavha: katta Fraunces jumla, ostida izoh va jonli raqamlar,
 * o'ngda sichqonchaga ergashuvchi chizilgan illyustratsiya. Quti yo'q — sarlavha sahnaning
 * o'zida turadi, orqasida faqat xira nur. Sahifadagi yagona `h1` shu yerda. Kirish —
 * xiralikdan ochilish (blur → aniq). Telefonda illyustratsiya sarlavha ortiga fon bo'ladi.
 */
export const SectionHero = ({ eyebrow, title, description, art, children }: SectionHeroProps) => {
  const reduce = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 120, damping: 18 });
  const springY = useSpring(pointerY, { stiffness: 120, damping: 18 });
  const artX = useTransform(springX, (value) => value * PARALLAX);
  const artY = useTransform(springY, (value) => value * PARALLAX);
  const glowX = useTransform(springX, (value) => value * -PARALLAX * 1.6);

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (reduce || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - box.left) / box.width - 0.5);
    pointerY.set((event.clientY - box.top) / box.height - 0.5);
  };

  const onPointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <header
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="text-hero-ink relative isolate mb-6 pt-2 md:mb-8 md:pt-4"
    >
      <motion.div
        aria-hidden
        style={{ x: glowX }}
        className="bg-gold/10 absolute -top-24 right-1/4 -z-10 size-72 rounded-full blur-3xl"
      />
      <div className="relative grid items-center gap-6 md:grid-cols-12">
        <div className="min-w-0 md:col-span-8">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="text-ink-3 mb-3 flex items-center gap-2 text-sm font-medium"
          >
            <span aria-hidden className="relative flex size-2">
              <span className="bg-accent animate-ping-soft absolute inset-0 rounded-full" />
              <span className="bg-accent relative size-2 rounded-full" />
            </span>
            {eyebrow}
          </motion.div>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
            className="font-display text-hero max-w-4xl"
          >
            {title}
          </motion.h1>
          {description ? (
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: EASE_OUT }}
              className="text-hero-ink-2 text-md mt-3 max-w-2xl"
            >
              {description}
            </motion.p>
          ) : null}
          {children ? <div className="mt-5 flex flex-wrap gap-2.5">{children}</div> : null}
        </div>
        <motion.div
          aria-hidden
          style={{ x: artX, y: artY }}
          className="pointer-events-none absolute -top-4 -right-6 w-1/2 max-w-64 opacity-20 md:static md:col-span-4 md:w-full md:max-w-80 md:justify-self-end md:opacity-90"
        >
          {art}
        </motion.div>
      </div>
    </header>
  );
};

type HeroStatProps = {
  label: string;
  value: ReactNode;
  /** `alert` — e'tibor talab qiladigan raqam (tilla emas, ember). */
  tone?: "default" | "alert";
};

/** Hero ichidagi jonli raqam «plitkasi». */
export const HeroStat = ({ label, value, tone = "default" }: HeroStatProps) => (
  <div
    className={cn(
      "panel-surface min-w-32 rounded-2xl border px-4 py-3",
      tone === "alert" && "border-crit/30 bg-crit-soft",
    )}
  >
    <div className="text-2xs text-hero-ink-2 font-medium">{label}</div>
    <div className={cn("num mt-1 text-xl font-semibold", tone === "alert" ? "text-hero-alert" : "text-gold")}>
      {value}
    </div>
  </div>
);
