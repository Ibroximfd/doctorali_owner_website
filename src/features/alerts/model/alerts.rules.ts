import type { Alert, AlertSeverity } from "@/shared/domain/alert";
import { formatNumber } from "@/shared/lib/format";

/**
 * Signallar ekranining sof (React'siz) qoidalari: ro'yxatni bo'laklash, qoida
 * kodi → tarjima kaliti, chegara maydonini o'qish va ko'rsatish.
 */

/** Ro'yxatni ekran bo'laklariga ajratadi: ochiq (hammasi), tanlangan darajadagilari va ko'rilganlar. */
export const splitAlerts = (alerts: readonly Alert[], severity: AlertSeverity | null) => {
  const open = alerts.filter((alert) => alert.status === "open");

  return {
    open,
    visible: severity === null ? open : open.filter((alert) => alert.severity === severity),
    acknowledged: alerts.filter((alert) => alert.status === "acknowledged"),
  };
};

/**
 * Qoida kodi → tarjima kaliti: `orders.unassigned_courier` → `orders_unassigned_courier`.
 * Nuqta next-intl da ichki yo'l ajratuvchisi, shuning uchun kalitda ishlatilmaydi.
 */
export const ruleMessageKey = (code: string): string => code.replaceAll(".", "_");

const THRESHOLD_PATTERN = /^\d+(\.\d+)?$/;

/**
 * Maydonga yozilgan chegara → son. Ming ajratuvchi bo'shliq va o'nlik vergul
 * qabul qilinadi (`5 000 000`, `17,5`); bo'sh, manfiy yoki son bo'lmagan matn — `null`.
 */
export const parseThreshold = (text: string): number | null => {
  const normalized = text.replace(/\s/g, "").replace(",", ".");
  return THRESHOLD_PATTERN.test(normalized) ? Number(normalized) : null;
};

/** Chegarani ko'rsatish: butun son ming ajratuvchi bilan (`5 000 000`), kasr — vergul bilan (`17,5`). */
export const formatThreshold = (value: number): string =>
  Number.isInteger(value) ? formatNumber(value) : String(value).replace(".", ",");
