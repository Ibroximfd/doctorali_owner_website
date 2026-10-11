"use client";

import { useSyncExternalStore } from "react";

/** CSS media so'rovi natijasi. Serverda `false` — mobil-birinchi ko'rinish render qilinadi. */
export const useMediaQuery = (query: string): boolean =>
  useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );

/** Tailwind `md` (768px) dan boshlab — planshet va desktop. */
export const useIsDesktop = (): boolean => useMediaQuery("(min-width: 768px)");
