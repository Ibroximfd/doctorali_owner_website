import type { MockContext } from "../engine";
import { filialsState, type FilialState, type LeaderRole } from "../structure-v2";
import { mockError, mockResponse, type MockHandler } from "../types";

/**
 * Boshliq ↔ B.L / B.O yozishmasi (TZ 32 §C-1). Kanal = filial × rahbar O'RNI: id barqaror
 * (`filial*10 + 1|2`), rahbar tuzilma holatidan o'qiladi — rahbarlikdan olinsa `leader: null`,
 * tarix joyida qoladi. Xabarlar va o'qilganlik kursorlari server xotirasida.
 */

type OwnerRole = "logistics" | "sales";
const ROLE_OF: Record<OwnerRole, LeaderRole> = { logistics: "chief_logist", sales: "chief_operator" };
const LABEL: Record<OwnerRole, string> = { logistics: "Bosh logist", sales: "Bosh operator" };
const OWNER = { user_id: 1, operator_id: null, full_name: "Boshliq", username: "", role: "owner" };

type StoredMessage = {
  id: number;
  channel_id: number;
  text: string;
  created_at: string;
  from_owner: boolean;
  file: { name: string; size: number; mime: string; url: null } | null;
  ref: { type: string; id: string; label: string | null; exists: boolean } | null;
  reply_to: number | null;
};

type ChannelState = { messages: StoredMessage[]; ownerRead: number; leaderRead: number };

const MINUTE = 60_000;
const channelIdOf = (filialId: number, role: OwnerRole) => filialId * 10 + (role === "logistics" ? 1 : 2);

const SEED: Record<OwnerRole, readonly { owner: boolean; text: string; minutesAgo: number }[]> = {
  logistics: [
    { owner: true, text: "Assalomu alaykum. Kecha nechta zakaz yo'lda qoldi?", minutesAgo: 600 },
    {
      owner: false,
      text: "Va alaykum assalom. 14 ta — ertalab hammasi kuryerlarga berildi.",
      minutesAgo: 560,
    },
    { owner: false, text: "Bosh kuryerdan pulni bugun kechgacha olamiz.", minutesAgo: 45 },
  ],
  sales: [
    { owner: true, text: "Atkaz nega oshdi? Qo'ng'iroqlarni tinglab ko'ring.", minutesAgo: 300 },
    { owner: false, text: "Ko'rib chiqdik: asosan narx savoli. Skriptni yangiladik.", minutesAgo: 20 },
  ],
};

let nextId = 1;
const channels = new Map<number, ChannelState>();

const seedChannel = (id: number, role: OwnerRole, now: Date): ChannelState => {
  const messages = SEED[role].map((seed) => ({
    id: nextId++,
    channel_id: id,
    text: seed.text,
    created_at: new Date(now.getTime() - seed.minutesAgo * MINUTE).toISOString(),
    from_owner: seed.owner,
    file: null,
    ref: null,
    reply_to: null,
  }));
  // oxirgi rahbar xabari o'qilmagan; rahbar boshliqning hamma xabarini o'qigan
  const lastLeader = messages.filter((message) => !message.from_owner).at(-1)?.id ?? 0;
  return { messages, ownerRead: lastLeader - 1, leaderRead: messages.at(-1)?.id ?? 0 };
};

const stateOf = (id: number, role: OwnerRole, now: Date): ChannelState => {
  const existing = channels.get(id);
  if (existing) return existing;
  const created = seedChannel(id, role, now);
  channels.set(id, created);
  return created;
};

/** Testlar uchun: yozishma boshlang'ich holatiga. */
export const resetChats = (): void => {
  channels.clear();
  nextId = 1;
};

type Located = { id: number; role: OwnerRole; filial: FilialState };

const allChannels = (): Located[] =>
  filialsState()
    .filter((filial) => filial.is_active)
    .flatMap((filial) =>
      (["logistics", "sales"] as const).map((role) => ({ id: channelIdOf(filial.id, role), role, filial })),
    );

const find = (raw: string | undefined): Located | null =>
  allChannels().find((channel) => String(channel.id) === raw) ?? null;

const leaderOf = ({ filial, role }: Located) => {
  const leader = filial.leaders[ROLE_OF[role]];
  return leader
    ? {
        seat_id: leader.seat_id,
        user_id: leader.seat_id + 1000,
        full_name: leader.full_name,
        username: leader.username,
        phone: null,
        is_active: true,
      }
    : null;
};

const messageDto = (located: Located, state: ChannelState, message: StoredMessage) => {
  const leader = leaderOf(located);
  const isRead = message.from_owner && message.id <= state.leaderRead;
  return {
    id: message.id,
    channel_id: message.channel_id,
    kind: message.file ? "file" : "text",
    text: message.text,
    created_at: message.created_at,
    edited_at: null,
    is_deleted: false,
    sender: message.from_owner
      ? OWNER
      : {
          user_id: leader?.user_id ?? null,
          operator_id: leader?.seat_id ?? null,
          full_name: leader?.full_name ?? LABEL[located.role],
          username: leader?.username ?? "",
          role: ROLE_OF[located.role],
        },
    reply_to: message.reply_to,
    file: message.file,
    mentions: [],
    ref: message.ref,
    is_mine: message.from_owner,
    read_count: isRead ? 1 : 0,
    readers: isRead && leader ? [{ user_id: leader.user_id, full_name: leader.full_name }] : [],
    is_read: isRead,
  };
};

const unreadOf = (state: ChannelState) =>
  state.messages.filter((message) => !message.from_owner && message.id > state.ownerRead).length;

const channelDto = (located: Located, now: Date) => {
  const state = stateOf(located.id, located.role, now);
  const last = state.messages.at(-1);
  const leader = leaderOf(located);
  const unread = unreadOf(state);
  return {
    id: located.id,
    kind: "owner_direct",
    owner_role: located.role,
    owner_role_label: LABEL[located.role],
    filial: { id: located.filial.id, name: located.filial.name },
    title: `Boshliq ↔ ${LABEL[located.role]} (${located.filial.name})`,
    leader,
    unread_count: unread,
    unread,
    last_message: last
      ? {
          text: last.text || null,
          kind: last.file ? "file" : "text",
          by: last.from_owner ? OWNER.full_name : (leader?.full_name ?? LABEL[located.role]),
          at: last.created_at,
        }
      : null,
    last_message_at: last?.created_at ?? null,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** `ref` — obyekt (JSON) yoki satr (multipart'da JSON matn). */
const readRef = (raw: unknown): StoredMessage["ref"] | "invalid" => {
  if (raw === undefined || raw === null || raw === "") return null;
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      return "invalid";
    }
  }
  if (!isRecord(value) || (value.type !== "order" && value.type !== "lead")) return "invalid";
  const id = typeof value.id === "string" || typeof value.id === "number" ? String(value.id).trim() : "";
  if (id === "") return "invalid";
  // namunada «mavjud» — kamida 3 xonali raqam; qolgani `exists: false` (havola baribir saqlanadi)
  const exists = /^\d{3,}$/.test(id);
  return {
    type: value.type,
    id,
    label: exists ? (value.type === "order" ? `№${id}` : `Lid #${id}`) : null,
    exists,
  };
};

const readFile = (raw: unknown): StoredMessage["file"] =>
  isRecord(raw) && typeof raw.name === "string"
    ? {
        name: raw.name,
        size: typeof raw.size === "number" ? raw.size : 0,
        mime: typeof raw.type === "string" ? raw.type : "",
        url: null,
      }
    : null;

const TEXT_MAX = 8000;

const postMessage = (ctx: MockContext) => {
  const located = find(ctx.params.id);
  if (!located) return mockError(404, "chat_not_found");
  const state = stateOf(located.id, located.role, ctx.now);
  const body = isRecord(ctx.body) ? ctx.body : {};
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const file = readFile(body.file);
  if (text === "" && file === null) return mockError(400, "empty_message");
  if (text.length > TEXT_MAX) return mockError(400, "validation_error");
  const ref = readRef(body.ref);
  if (ref === "invalid") return mockError(400, "validation_error");
  const replyTo = body.reply_to === undefined || body.reply_to === null ? null : Number(body.reply_to);
  if (replyTo !== null && !state.messages.some((message) => message.id === replyTo))
    return mockError(400, "reply_not_found");

  const message: StoredMessage = {
    id: nextId++,
    channel_id: located.id,
    text,
    created_at: ctx.now.toISOString(),
    from_owner: true,
    file,
    ref,
    reply_to: replyTo,
  };
  state.messages.push(message);
  return mockResponse(201, { message: messageDto(located, state, message) });
};

const PAGE_DEFAULT = 30;
const PAGE_MAX = 100;

export const chatsHandlers: readonly MockHandler[] = [
  {
    method: "GET",
    path: "chats/",
    resolve: (ctx) => {
      const chats = allChannels().map((channel) => channelDto(channel, ctx.now));
      return { chats, total_unread: chats.reduce((sum, chat) => sum + chat.unread_count, 0) };
    },
  },
  {
    method: "GET",
    path: "chats/:id/messages/",
    resolve: (ctx) => {
      const located = find(ctx.params.id);
      if (!located) return mockError(404, "chat_not_found");
      const state = stateOf(located.id, located.role, ctx.now);
      const before = Number(ctx.searchParams.get("before_id") ?? "") || null;
      const limit = Math.min(PAGE_MAX, Number(ctx.searchParams.get("limit") ?? "") || PAGE_DEFAULT);
      const older = state.messages.filter((message) => before === null || message.id < before);
      const page = older.slice(-limit);
      return {
        chat: channelDto(located, ctx.now),
        has_more: older.length > page.length,
        oldest_id: page[0]?.id ?? null,
        messages: page.map((message) => messageDto(located, state, message)),
      };
    },
  },
  { method: "POST", path: "chats/:id/messages/", resolve: postMessage },
  {
    method: "POST",
    path: "chats/:id/read/",
    resolve: (ctx) => {
      const located = find(ctx.params.id);
      if (!located) return mockError(404, "chat_not_found");
      const state = stateOf(located.id, located.role, ctx.now);
      const body = isRecord(ctx.body) ? ctx.body : {};
      const requested = Number(body.last_message_id ?? state.messages.at(-1)?.id ?? 0) || 0;
      // kursor faqat oldinga suriladi
      state.ownerRead = Math.max(state.ownerRead, requested);
      return { channel_id: located.id, last_read_message_id: state.ownerRead, unread_count: unreadOf(state) };
    },
  },
];
