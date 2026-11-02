import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { optNum, optStr, str } from "@/shared/lib/lenient";

/**
 * Boshliq ↔ filial rahbarlari (B.L / B.O) yozishmasi — TZ 32 §C-1 (`/api/owner/chats/*`).
 * Kanal O'RINGA bog'langan: rahbar almashsa kanal id si va tarixi joyida qoladi — panel kanalni
 * odam id siga bog'lamaydi. `leader` o'rin bo'sh bo'lsa `null`, kanal baribir ko'rinadi.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const OWNER_ROLES = ["logistics", "sales"] as const;
export type OwnerRole = (typeof OWNER_ROLES)[number];

const leaderSchema = z.object({
  seat_id: z.number(),
  user_id: z.number().nullable().default(null),
  full_name: str,
  username: str,
  phone: optStr,
  is_active: z.boolean().default(true),
});

const lastMessageSchema = z.object({
  text: optStr,
  kind: z.string().default("text"),
  by: optStr,
  at: optStr,
});

/** `unread_count` va `unread` — ayni qiymat; qaysi biri kelsa shu o'qiladi. */
const channelSchema = z.preprocess(
  (raw) =>
    isRecord(raw) && raw.unread_count === undefined && raw.unread !== undefined
      ? { ...raw, unread_count: raw.unread }
      : raw,
  z.object({
    id: z.number(),
    kind: z.string().default("owner_direct"),
    owner_role: z.string(),
    owner_role_label: z.string().default(""),
    filial: z.object({ id: z.number(), name: z.string() }).nullable().default(null),
    title: z.string().default(""),
    leader: leaderSchema.nullable().default(null),
    unread_count: z.number().default(0),
    last_message: lastMessageSchema.nullable().default(null),
    last_message_at: optStr,
  }),
);

/** `GET /chats/` → `{chats, total_unread}`. `total_unread` kelmasa — kanallardan yig'iladi. */
export const channelsSchema = z.preprocess(
  (raw) => {
    if (!isRecord(raw) || raw.total_unread !== undefined) return raw;
    const chats = Array.isArray(raw.chats) ? raw.chats : [];
    const total = chats.reduce<number>(
      (sum, chat) => sum + (isRecord(chat) ? Number(chat.unread_count ?? chat.unread ?? 0) || 0 : 0),
      0,
    );
    return { ...raw, total_unread: total };
  },
  z.object({ chats: z.array(channelSchema), total_unread: z.number() }),
);
export type Channels = Camelized<z.infer<typeof channelsSchema>>;
export type Channel = Channels["chats"][number];

/**
 * Ilova shakli hujjatda ochiq (`file: null` namunasi) — chidamli o'qiladi: havola (`url | file`),
 * nom, hajm va turi bo'lsa olinadi; havolasiz fayl ham nomi bilan ko'rinadi.
 */
const fileSchema = z.preprocess(
  (raw) => {
    if (typeof raw === "string") return { url: raw };
    if (!isRecord(raw)) return raw;
    return {
      url: raw.url ?? raw.file ?? raw.src ?? null,
      name: raw.name ?? raw.file_name ?? raw.filename ?? null,
      size: raw.size ?? raw.file_size ?? null,
      mime: raw.mime ?? raw.content_type ?? raw.mime_type ?? raw.type ?? null,
      kind: raw.kind ?? null,
    };
  },
  z.object({ url: optStr, name: optStr, size: optNum, mime: optStr, kind: optStr }).nullable(),
);

/** Javob berilgan xabar — id yoki qisqa obyekt (`{id, text, sender}`). */
const replySchema = z.preprocess(
  (raw) => {
    if (typeof raw === "number") return { id: raw };
    if (!isRecord(raw)) return raw;
    const sender = isRecord(raw.sender) ? raw.sender : null;
    return { id: raw.id, text: raw.text ?? null, sender_name: sender?.full_name ?? raw.sender_name ?? null };
  },
  z.object({ id: z.number(), text: optStr, sender_name: optStr }).nullable(),
);

export const messageSchema = z.object({
  id: z.number(),
  channel_id: z.number().nullable().default(null),
  kind: z.string().default("text"),
  text: str,
  created_at: z.string(),
  edited_at: optStr,
  is_deleted: z.boolean().default(false),
  sender: z
    .object({
      user_id: z.number().nullable().default(null),
      full_name: str,
      role: optStr,
    })
    .nullable()
    .default(null),
  reply_to: replySchema.default(null),
  file: fileSchema.default(null),
  /** Zakaz/lid havolasi; yo'q id ham qabul qilinadi (`exists: false`, `label: null`). */
  ref: z
    .object({
      type: z.string(),
      id: z.union([z.string(), z.number()]).transform(String),
      label: optStr,
      exists: z.boolean().default(true),
    })
    .nullable()
    .default(null),
  is_mine: z.boolean().default(false),
  read_count: z.number().default(0),
  is_read: z.boolean().default(false),
});
export type ChatMessage = Camelized<z.infer<typeof messageSchema>>;

/** `GET /chats/{id}/messages/?before_id=&limit=`. */
export const messagesPageSchema = z.object({
  chat: channelSchema.nullable().default(null),
  has_more: z.boolean().default(false),
  oldest_id: z.number().nullable().default(null),
  messages: z.array(messageSchema),
});
export type MessagesPage = Camelized<z.infer<typeof messagesPageSchema>>;

/** `POST /chats/{id}/messages/` → `201 {message}`. */
export const sentSchema = z.object({ message: messageSchema });

/** `POST /chats/{id}/read/`. */
export const readResultSchema = z.object({
  channel_id: z.number(),
  last_read_message_id: z.number().nullable().default(null),
  unread_count: z.number().default(0),
});
export type ReadResult = Camelized<z.infer<typeof readResultSchema>>;

/* ---------- jonli kanal (owner soketi) ---------- */

export const chatMessageEventSchema = z.object({
  type: z.literal("chat_message"),
  channel_id: z.number(),
  message: messageSchema,
});

export const chatReadEventSchema = z.object({
  type: z.literal("chat_read"),
  channel_id: z.number(),
  last_read_message_id: z.number().nullable().default(null),
  by: z.object({ kind: optStr }).nullable().default(null),
  unread: z.number().nullable().default(null),
});

/* ---------- yuborish ---------- */

export const REF_TYPES = ["order", "lead"] as const;
export type RefType = (typeof REF_TYPES)[number];

export type Draft = {
  text: string;
  file: File | null;
  ref: { type: RefType; id: string } | null;
  replyTo: number | null;
};
