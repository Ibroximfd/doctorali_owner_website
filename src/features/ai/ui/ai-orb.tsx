"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";

import { cn } from "@/shared/lib/cn";

/** «Tirik» shakl: ikki organik ko'rinish orasida border-radius morfi. */
const MORPH = [
  "42% 58% 55% 45% / 48% 42% 58% 52%",
  "58% 42% 45% 55% / 42% 58% 42% 58%",
  "42% 58% 55% 45% / 48% 42% 58% 52%",
];

const spin = (seconds: number, reverse = false) =>
  ({
    rotate: { duration: seconds, ease: "linear", repeat: Infinity },
    borderRadius: {
      duration: seconds * 0.75,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: reverse ? "reverse" : "loop",
    },
  }) satisfies Transition;

type AiOrbProps = {
  /** AI tahlil qilayotganda qatlamlar tezroq aylanadi. */
  thinking?: boolean;
  className?: string;
};

/**
 * AI belgisi — shakli o'zgarib aylanuvchi konik-gradient shar: tashqi nur, qarama-qarshi
 * aylanuvchi ichki qatlam va yorqin yadro. Harakat kamaytirilgan bo'lsa — statik doira.
 * Faqat bezak (`aria-hidden`); ranglar tokenlardan.
 */
export const AiOrb = ({ thinking = false, className }: AiOrbProps) => {
  const reduce = useReducedMotion() ?? false;
  const pace = thinking ? 0.4 : 1;
  const layer = (seconds: number, direction: 1 | -1, reverse = false) =>
    reduce
      ? { animate: undefined, transition: undefined }
      : {
          animate: { rotate: 360 * direction, borderRadius: MORPH },
          transition: spin(seconds * pace, reverse),
        };

  return (
    <div aria-hidden data-testid="ai-orb" className={cn("relative", className)}>
      <div className="bg-glow absolute -inset-6 rounded-full blur-xl" />
      <motion.div
        {...layer(7, 1)}
        className={cn(
          "from-accent via-gold to-series-1 absolute inset-0 bg-conic opacity-85 blur-lg",
          reduce && "rounded-full",
        )}
      />
      <motion.div
        {...layer(9, -1, true)}
        className={cn(
          "from-forest-2 via-accent to-gold absolute inset-3.5 bg-conic-180 blur-md",
          reduce && "rounded-full",
        )}
      />
      <motion.div
        animate={reduce ? undefined : { borderRadius: MORPH }}
        transition={reduce ? undefined : { duration: 4 * pace, ease: "easeInOut", repeat: Infinity }}
        className="from-hero-ink via-mint/90 to-forest-2/20 absolute inset-1/4 rounded-full bg-radial mix-blend-screen"
      />
    </div>
  );
};

/** Chatdagi kichik AI belgisi: aylanuvchi konik doira; javob tayyorlanayotganda tezlashadi. */
export const AiAvatar = ({ thinking = false, className }: AiOrbProps) => {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.span
      aria-hidden
      animate={reduce ? undefined : { rotate: 360 }}
      transition={reduce ? undefined : { duration: thinking ? 1.6 : 6, ease: "linear", repeat: Infinity }}
      className={cn(
        "from-accent via-gold to-series-1 block size-8.5 shrink-0 rounded-full bg-conic saturate-125",
        className,
      )}
    />
  );
};
