"use client";

import { useTranslations } from "next-intl";

const DASH = "—";

/**
 * Backend enum qiymatlari → o'qiladigan yorliq. Tarjimasi yo'q (yangi) qiymat
 * yiqitmaydi: backend bergan `fallback` yorliq, u ham bo'lmasa qiymatning o'zi chiqadi.
 */
export const useOrderLabels = () => {
  const t = useTranslations("orders");

  const label = (group: string, key: string, fallback?: string | null): string => {
    const path = `${group}.${key}`;
    return t.has(path) ? t(path) : fallback || key;
  };

  return {
    source: (key: string, fallback?: string | null) => label("sources", key, fallback),
    region: (code: string | null, fallback?: string | null) =>
      code === null ? fallback || DASH : label("regions", code, fallback),
    cancelReason: (key: string, fallback?: string | null) => label("cancelReason", key, fallback),
    confirmationChannel: (key: string, fallback?: string | null) =>
      label("confirmationChannels", key, fallback),
    paymentMethod: (key: string | null) => (key === null ? DASH : label("paymentMethods", key)),
    paymentStatus: (key: string) => label("paymentStatus", key),
    pendingReason: (key: string) => label("pendingReasons", key),
    stage: (key: string) => label("stageDurations.stages", key),
    stuckRule: (key: string) => label("stuck.rules", key),
    actor: (type: string) => label("timeline.actors", type),
    /** Birinchi mavjud kalit tarjimasi; hech biri bo'lmasa — `fallback`. */
    first: (paths: readonly string[], fallback: string): string => {
      const found = paths.find((path) => t.has(path));
      return found === undefined ? fallback : t(found);
    },
  };
};
