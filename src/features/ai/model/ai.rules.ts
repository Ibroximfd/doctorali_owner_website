import type { Chat, ChatBlock } from "./ai.schema";

export const FINDING_CATEGORIES = [
  "shortage",
  "anomaly",
  "fraud_risk",
  "data_error",
  "process_delay",
  "reconciliation",
] as const;
export type FindingCategory = (typeof FINDING_CATEGORIES)[number];
export const isFindingCategory = (value: string): value is FindingCategory =>
  FINDING_CATEGORIES.some((known) => known === value);

export const FEEDBACK_VERDICTS = ["confirmed", "false_positive", "resolved"] as const;
export type FeedbackVerdict = (typeof FEEDBACK_VERDICTS)[number];

export const CHECK_STATUSES = ["fail", "warn", "pass"] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];
export const isCheckStatus = (value: string): value is CheckStatus =>
  CHECK_STATUSES.some((known) => known === value);

export const checkRank = (status: string): number => {
  const index = CHECK_STATUSES.findIndex((known) => known === status);
  return index === -1 ? CHECK_STATUSES.length : index;
};

/** Ishonch darajasi: 75+ — yuqori, 50+ — o'rta, qolgani — past (tekshirib ko'rish kerak). */
export type ConfidenceLevel = "high" | "medium" | "low";
export const confidenceLevel = (confidence: number): ConfidenceLevel => {
  if (confidence >= 75) return "high";
  return confidence >= 50 ? "medium" : "low";
};

/** Sog'lom ball rangi: 80+ — yaxshi, 60+ — o'rta, qolgani — xavf. */
export type HealthTone = "good" | "warn" | "crit";
export const healthTone = (score: number): HealthTone => {
  if (score >= 80) return "good";
  return score >= 60 ? "warn" : "crit";
};

/** Javob hali tayyorlanmoqdami — panel shunga qarab chatni qayta so'raydi. */
export const hasPendingReply = (chat: Pick<Chat, "messages"> | undefined): boolean =>
  chat?.messages.some((message) => message.status === "pending") ?? false;

export const MESSAGE_MAX = 2000;

/** Ma'lum blok turlarigina chiziladi. */
const KNOWN_BLOCKS = ["kpis", "table", "bullets", "chart", "links"] as const;
type KnownBlockType = (typeof KNOWN_BLOCKS)[number];

export const isKnownBlock = (block: ChatBlock): block is Extract<ChatBlock, { type: KnownBlockType }> =>
  KNOWN_BLOCKS.some((known) => known === block.type);

/** Ilova (fayl) BFF orqali yuklanadi: yo'l `/file/` bilan tugaydi — fayl o'zgarishsiz o'tadi. */
export const attachmentHref = (id: number): string => `/api/owner/ai/attachments/${id}/file/`;

/** Tavsiyalar: avval ustuvorlik (1 — eng muhim), keyin muddat (hozir → oy). */
const HORIZONS = ["now", "week", "month"];
export const sortRecommendations = <Row extends { priority: number; horizon: string }>(
  rows: readonly Row[],
): Row[] =>
  [...rows].sort(
    (a, b) => a.priority - b.priority || HORIZONS.indexOf(a.horizon) - HORIZONS.indexOf(b.horizon),
  );

/* ---------- avto-tuzatish ---------- */

export const ACTION_MODES = ["auto", "approve", "suggest"] as const;
export type ActionMode = (typeof ACTION_MODES)[number];
export const isActionMode = (value: string): value is ActionMode =>
  ACTION_MODES.some((known) => known === value);

/** Bekor qilish hali mumkinmi (`undo_until` o'tmagan va amal bajarilgan). */
export const canUndo = (action: { status: string; undoUntil: string | null }, now: number): boolean =>
  action.status === "done" && action.undoUntil !== null && Date.parse(action.undoUntil) > now;

/** Bekor qilishgacha qolgan to'liq soat. */
export const undoHoursLeft = (undoUntil: string, now: number): number =>
  Math.max(0, Math.floor((Date.parse(undoUntil) - now) / 3_600_000));
