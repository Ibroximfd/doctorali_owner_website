import { z } from "zod";

/**
 * Jonli kanal (`/ws/owner/`): hodisa kelganda ekrandagi ma'lumot yangilanadi.
 * Kanal faqat tezlashtiruvchi — u bo'lmasa ham so'rovlar o'z jadvalida
 * (har 60 s) yangilanadi, shuning uchun uzilish xato sifatida ko'rsatilmaydi.
 */

/** `02_BACKEND_TZ` §5 dagi hodisalar — hammasi "ma'lumot o'zgardi" degan signal. */
export const LIVE_EVENT_TYPES = [
  "feed_event",
  "kpi_tick",
  "pipeline_changed",
  "alert_opened",
  "alert_resolved",
  // TZ 32 §C-1: rahbarlar bilan yozishma — faqat chat keshi yangilanadi (`live-bus`)
  "chat_message",
  "chat_read",
] as const;

/** Faqat o'z bo'limiga tegishli hodisalar: butun panel qayta so'ralmaydi. */
export const SCOPED_EVENT_TYPES: readonly string[] = ["chat_message", "chat_read"];

export type LiveEvent = { type: string; payload: Record<string, unknown> };

const messageSchema = z.object({ type: z.string() });
const ticketSchema = z.object({ ticket: z.string().nullable() });

/** Tanilgan hodisa (turi + to'liq tanasi); tanib bo'lmaydigan xabar — `null` (e'tiborsiz qoldiriladi). */
export const parseLiveEvent = (raw: unknown): LiveEvent | null => {
  if (typeof raw !== "string") return null;
  try {
    const json: unknown = JSON.parse(raw);
    const parsed = messageSchema.passthrough().safeParse(json);
    return parsed.success && (LIVE_EVENT_TYPES as readonly string[]).includes(parsed.data.type)
      ? { type: parsed.data.type, payload: parsed.data }
      : null;
  } catch {
    return null;
  }
};

/** Xabar turi; tanib bo'lmaydigan xabar — `null`. */
export const liveEventType = (raw: unknown): string | null => parseLiveEvent(raw)?.type ?? null;

const MAX_RETRY_DELAY_MS = 30_000;

/** Qayta ulanish kechikishi: 2 s, 4 s, 8 s … 30 s gacha. */
export const retryDelay = (attempt: number): number =>
  Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** Math.max(1, attempt));

type LiveChannelOptions = {
  url: string;
  /** Bir martalik qisqa token (`/api/auth/ws-ticket`). `null` — kanal hozircha yo'q. */
  loadTicket: () => Promise<unknown>;
  onEvent: (event: LiveEvent) => void;
};

/** Kanalni ochadi va uzilganda o'zi qayta ulanadi. Qaytgan funksiya — yopish. */
export const openLiveChannel = ({ url, loadTicket, onEvent }: LiveChannelOptions): (() => void) => {
  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;
  let isClosed = false;

  const scheduleReconnect = () => {
    if (isClosed) return;
    attempt += 1;
    retryTimer = setTimeout(() => void connect(), retryDelay(attempt));
  };

  const connect = async () => {
    try {
      const { ticket } = ticketSchema.parse(await loadTicket());
      if (isClosed) return;
      if (ticket === null) return scheduleReconnect();

      socket = new WebSocket(`${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(ticket)}`);
      socket.onopen = () => {
        attempt = 0;
      };
      socket.onmessage = (event) => {
        const parsed = parseLiveEvent(event.data);
        if (parsed !== null) onEvent(parsed);
      };
      socket.onclose = scheduleReconnect;
    } catch {
      scheduleReconnect();
    }
  };

  void connect();

  return () => {
    isClosed = true;
    clearTimeout(retryTimer);
    socket?.close();
  };
};
