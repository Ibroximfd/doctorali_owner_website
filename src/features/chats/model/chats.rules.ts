import type { Channel, Channels, ChatMessage, Draft } from "./chats.schema";

/** Matn chegarasi va ilova hajmlari (TZ 32 §C-1) — klientda ham tekshiriladi. */
export const TEXT_MAX = 8000;
const MB = 1024 * 1024;
export const FILE_LIMITS = { image: 10 * MB, video: 50 * MB, audio: 15 * MB, document: 25 * MB } as const;
export type FileKind = keyof typeof FILE_LIMITS;

export const isFileKind = (value: string | null): value is FileKind =>
  value !== null && Object.hasOwn(FILE_LIMITS, value);

export const fileKindOf = (mime: string | null | undefined): FileKind => {
  if (mime?.startsWith("image/")) return "image";
  if (mime?.startsWith("video/")) return "video";
  if (mime?.startsWith("audio/")) return "audio";
  return "document";
};

export const fileLimitMb = (kind: FileKind): number => FILE_LIMITS[kind] / MB;

export type DraftProblem = "empty" | "tooLong" | "fileTooLarge" | "refId" | null;

/** Yuborishdan oldingi tekshiruv: matn yoki fayl shart, matn ≤ 8000, fayl o'z chegarasida. */
export const draftProblem = (draft: Draft): DraftProblem => {
  if (draft.text.trim() === "" && draft.file === null) return "empty";
  if (draft.text.length > TEXT_MAX) return "tooLong";
  if (draft.file && draft.file.size > FILE_LIMITS[fileKindOf(draft.file.type)]) return "fileTooLarge";
  if (draft.ref && draft.ref.id.trim() === "") return "refId";
  return null;
};

/** Ro'li tartibi: avval bosh logist, keyin bosh operator; notanishi oxirida. */
const roleRank = (role: string): number => (role === "logistics" ? 0 : role === "sales" ? 1 : 2);

export type FilialGroup = { key: string; name: string | null; channels: Channel[] };

/** Kanallar filial bo'yicha guruhlab (birinchi uchrash tartibida), ichida — B.L, keyin B.O. */
export const groupByFilial = (channels: readonly Channel[]): FilialGroup[] => {
  const groups = new Map<string, FilialGroup>();
  for (const channel of channels) {
    const key = channel.filial ? String(channel.filial.id) : "none";
    const group = groups.get(key) ?? { key, name: channel.filial?.name ?? null, channels: [] };
    group.channels.push(channel);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    channels: [...group.channels].sort((a, b) => roleRank(a.ownerRole) - roleRank(b.ownerRole)),
  }));
};

/** Xabarlarni birlashtiradi: id bo'yicha takrorsiz (yangisi ustun), eskidan yangiga. */
export const mergeMessages = (
  current: readonly ChatMessage[],
  incoming: readonly ChatMessage[],
): ChatMessage[] => {
  const byId = new Map<number, ChatMessage>();
  for (const message of [...current, ...incoming]) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.id - b.id);
};

export const newestId = (messages: readonly ChatMessage[]): number | null =>
  messages.reduce<number | null>(
    (max, message) => (max === null || message.id > max ? message.id : max),
    null,
  );

const withTotal = (chats: Channel[]): Channels => ({
  chats,
  totalUnread: chats.reduce((sum, chat) => sum + chat.unreadCount, 0),
});

/**
 * Jonli yangi xabar ro'yxatga: oxirgi xabar yangilanadi; rahbardan kelgan va kanal hozir ochiq
 * bo'lmasa — o'qilmaganlar +1 (ochiq kanal darhol «o'qildi» qilinadi).
 */
export const applyIncoming = (
  channels: Channels,
  channelId: number,
  message: ChatMessage,
  isOpen: boolean,
): Channels =>
  withTotal(
    channels.chats.map((chat) =>
      chat.id !== channelId
        ? chat
        : {
            ...chat,
            lastMessage: {
              text: message.text || null,
              kind: message.kind,
              by: message.sender?.fullName ?? null,
              at: message.createdAt,
            },
            lastMessageAt: message.createdAt,
            unreadCount: chat.unreadCount + (message.isMine || isOpen ? 0 : 1),
          },
    ),
  );

/** `read/` javobi yoki o'z «o'qildi» hodisasi — kanal o'qilmaganlari serverdagi songa. */
export const applyUnread = (channels: Channels, channelId: number, unread: number): Channels =>
  withTotal(channels.chats.map((chat) => (chat.id === channelId ? { ...chat, unreadCount: unread } : chat)));

/** Rahbar o'qidi: o'zim yozgan, kursorgacha bo'lgan xabarlar «o'qildi». */
export const markReadUpTo = (messages: readonly ChatMessage[], lastReadId: number): ChatMessage[] =>
  messages.map((message) =>
    message.isMine && message.id <= lastReadId && !message.isRead
      ? { ...message, isRead: true, readCount: Math.max(1, message.readCount) }
      : message,
  );

/** Xato kodlari (`chats.errors.*`); notanishi — umumiy. */
const KNOWN_ERRORS = [
  "empty_message",
  "file_too_large",
  "validation_error",
  "reply_not_found",
  "chat_not_found",
  "section_forbidden",
] as const;

export const sendErrorKey = (code: string | undefined): string =>
  code && (KNOWN_ERRORS as readonly string[]).includes(code) ? code : "failed";

/**
 * Ilova havolasi: backendning `/media/…` yo'li panel domenidagi proksi orqali (faqat rasm —
 * proksi boshqasini bermaydi); to'liq URL o'z holicha.
 */
export const mediaHref = (url: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith("/media/")) return `/api${url}`;
  return /^https?:\/\//.test(url) ? url : null;
};

/** Rasm ilovasi panelda ko'rsatiladi: `/media/` (proksi) yoki shu ko'rinishdagi to'liq URL. */
export const imageSrc = (url: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith("/media/")) return `/api${url}`;
  try {
    const parsed = new URL(url);
    return parsed.pathname.startsWith("/media/") ? `/api${parsed.pathname}` : null;
  } catch {
    return null;
  }
};
