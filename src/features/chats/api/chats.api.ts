import { parseJson } from "@/shared/lib/envelope";
import { apiGet, apiSend, apiSendForm } from "@/shared/lib/http";

import {
  channelsSchema,
  messagesPageSchema,
  readResultSchema,
  sentSchema,
  type Channels,
  type ChatMessage,
  type Draft,
  type MessagesPage,
  type ReadResult,
} from "../model/chats.schema";

/** TZ 32 §C-1 — `/api/owner/chats/*`. */

export const MESSAGES_PAGE_SIZE = 30;

export const loadChannels = async (): Promise<Channels> => parseJson(channelsSchema, await apiGet("chats/"));

export const loadMessages = async (channelId: number, beforeId: number | null): Promise<MessagesPage> =>
  parseJson(
    messagesPageSchema,
    await apiGet(`chats/${channelId}/messages/`, {
      before_id: beforeId ?? undefined,
      limit: MESSAGES_PAGE_SIZE,
    }),
  );

/** Faylsiz — JSON; fayl bilan — `multipart/form-data` (`ref` JSON satr bo'lib ketadi). */
export const sendMessage = async ({
  channelId,
  draft,
}: {
  channelId: number;
  draft: Draft;
}): Promise<ChatMessage> => {
  const path = `chats/${channelId}/messages/`;
  const text = draft.text.trim();
  const ref = draft.ref ? { type: draft.ref.type, id: draft.ref.id.trim() } : undefined;
  if (draft.file === null) {
    const raw = await apiSend("post", path, {
      ...(text ? { text } : {}),
      ...(ref ? { ref } : {}),
      ...(draft.replyTo !== null ? { reply_to: draft.replyTo } : {}),
    });
    return parseJson(sentSchema, raw).message;
  }
  const form = new FormData();
  if (text) form.append("text", text);
  form.append("file", draft.file);
  if (ref) form.append("ref", JSON.stringify(ref));
  if (draft.replyTo !== null) form.append("reply_to", String(draft.replyTo));
  return parseJson(sentSchema, await apiSendForm(path, form)).message;
};

export const markRead = async ({
  channelId,
  lastMessageId,
}: {
  channelId: number;
  lastMessageId: number | null;
}): Promise<ReadResult> =>
  parseJson(
    readResultSchema,
    await apiSend(
      "post",
      `chats/${channelId}/read/`,
      lastMessageId === null ? {} : { last_message_id: lastMessageId },
    ),
  );
