"use client";

import {
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { parseAsInteger, useQueryState } from "nuqs";
import { useEffect, useRef } from "react";

import { env } from "@/shared/config/env";
import { subscribeLive } from "@/shared/lib/live-bus";
import type { LiveEvent } from "@/shared/lib/live-channel";
import { camelize } from "@/shared/lib/camelize";

import { loadChannels, loadMessages, markRead, sendMessage } from "../api/chats.api";
import { applyIncoming, applyUnread, markReadUpTo, mergeMessages } from "../model/chats.rules";
import {
  chatMessageEventSchema,
  chatReadEventSchema,
  type Channels,
  type ChatMessage,
  type MessagesPage,
} from "../model/chats.schema";

export const chatKeys = {
  all: ["chats"] as const,
  channels: () => [...chatKeys.all, "channels"] as const,
  messages: (channelId: number) => [...chatKeys.all, "messages", channelId] as const,
};

type MessagesData = InfiniteData<MessagesPage, number | null>;

/** Jonli kanal yo'q (demo yoki `NEXT_PUBLIC_WS_URL` berilmagan) — ochiq suhbat shu oraliqda so'raladi. */
const POLL_MESSAGES_MS = 15_000;
const POLL_CHANNELS_MS = 30_000;
const hasLive = env.wsUrl !== null;

export const useChannelsQuery = () =>
  useQuery({
    queryKey: chatKeys.channels(),
    queryFn: loadChannels,
    refetchInterval: hasLive ? false : POLL_CHANNELS_MS,
  });

/** Tanlangan kanal URL da (`?channel=12`) — havola ulashiladi, «orqaga» ishlaydi. */
export const useSelectedChannel = () => useQueryState("channel", parseAsInteger);

/**
 * Tarix sahifalab: birinchi sahifa — eng yangilari, keyingisi `before_id = oldest_id` bilan
 * yuqoriga (eskilar). `has_more` bo'lmasa to'xtaydi.
 */
export const useMessagesQuery = (channelId: number | null) =>
  useInfiniteQuery({
    queryKey: chatKeys.messages(channelId ?? 0),
    queryFn: channelId === null ? skipToken : ({ pageParam }) => loadMessages(channelId, pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => (last.hasMore && last.oldestId !== null ? last.oldestId : undefined),
    refetchInterval: hasLive ? false : POLL_MESSAGES_MS,
  });

/** Sahifalar bitta tartiblangan ro'yxatga (eskidan yangiga, takrorsiz). */
export const flattenMessages = (data: { pages: readonly MessagesPage[] } | undefined): ChatMessage[] =>
  mergeMessages([], data?.pages.flatMap((page) => page.messages) ?? []);

const addToNewestPage = (data: MessagesData | undefined, message: ChatMessage): MessagesData | undefined => {
  if (!data) return data;
  const [first, ...rest] = data.pages;
  if (!first) return data;
  return { ...data, pages: [{ ...first, messages: mergeMessages(first.messages, [message]) }, ...rest] };
};

const mapMessages = (
  data: MessagesData | undefined,
  update: (messages: ChatMessage[]) => ChatMessage[],
): MessagesData | undefined =>
  data ? { ...data, pages: data.pages.map((page) => ({ ...page, messages: update(page.messages) })) } : data;

export const useSendMessage = (channelId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (message) => {
      queryClient.setQueryData<MessagesData>(chatKeys.messages(channelId), (data) =>
        addToNewestPage(data, message),
      );
      queryClient.setQueryData<Channels>(chatKeys.channels(), (data) =>
        data ? applyIncoming(data, channelId, message, true) : data,
      );
    },
  });
};

export const useMarkRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markRead,
    onSuccess: (result) =>
      queryClient.setQueryData<Channels>(chatKeys.channels(), (data) =>
        data ? applyUnread(data, result.channelId, result.unreadCount) : data,
      ),
  });
};

const handleLive = (queryClient: QueryClient, event: LiveEvent, openChannel: number | null) => {
  if (event.type === "chat_message") {
    const parsed = chatMessageEventSchema.safeParse(event.payload);
    if (!parsed.success) return;
    const channelId = parsed.data.channel_id;
    const message = camelize(parsed.data.message);
    queryClient.setQueryData<MessagesData>(chatKeys.messages(channelId), (data) =>
      addToNewestPage(data, message),
    );
    queryClient.setQueryData<Channels>(chatKeys.channels(), (data) =>
      data ? applyIncoming(data, channelId, message, channelId === openChannel) : data,
    );
    return;
  }
  if (event.type === "chat_read") {
    const parsed = chatReadEventSchema.safeParse(event.payload);
    if (!parsed.success) return;
    const { channel_id: channelId, last_read_message_id: lastRead, by, unread } = parsed.data;
    // o'zim (ikkinchi qurilmadan) o'qidim — o'qilmaganlar soni; rahbar o'qidi — mening xabarlarimda belgi
    if (by?.kind === "owner") {
      if (unread !== null)
        queryClient.setQueryData<Channels>(chatKeys.channels(), (data) =>
          data ? applyUnread(data, channelId, unread) : data,
        );
    } else if (lastRead !== null) {
      queryClient.setQueryData<MessagesData>(chatKeys.messages(channelId), (data) =>
        mapMessages(data, (messages) => markReadUpTo(messages, lastRead)),
      );
    }
  }
};

/** Jonli `chat_message` / `chat_read` — faqat chat keshi yangilanadi (butun panel emas). */
export const useChatLive = (openChannel: number | null) => {
  const queryClient = useQueryClient();
  const open = useRef(openChannel);
  useEffect(() => {
    open.current = openChannel;
  }, [openChannel]);
  useEffect(() => subscribeLive((event) => handleLive(queryClient, event, open.current)), [queryClient]);
};
