"use client";

import { ArrowLeft, Info, MessagesSquare, SearchX, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { toAppError } from "@/shared/lib/app-error";
import { useCanAct } from "@/shared/stores/session-store";
import { Banner } from "@/shared/ui/banner";
import { Button } from "@/shared/ui/button";
import { ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { flattenMessages, useMarkRead, useMessagesQuery } from "../hooks/use-chats";
import type { Channel, ChatMessage } from "../model/chats.schema";
import { Composer } from "./composer";
import { MessageItem } from "./message-item";

type ConversationProps = { channel: Channel; onBack: () => void };

/** Tanlangan kanal: sarlavha, tarix (yuqoriga sahifalab), yozish formasi. */
export const Conversation = ({ channel, onBack }: ConversationProps) => {
  const t = useTranslations("chats.conversation");
  const tComposer = useTranslations("chats.composer");
  const canAct = useCanAct();
  const query = useMessagesQuery(channel.id);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const notFound = toAppError(query.error).code === "chat_not_found" && query.data === undefined;

  return (
    <section aria-labelledby="chat-title" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex items-start gap-2 border-b px-4 py-3 md:px-5">
        <Button size="icon" intent="ghost" className="lg:hidden" aria-label={t("back")} onClick={onBack}>
          <ArrowLeft aria-hidden />
        </Button>
        <div className="min-w-0">
          <h2 id="chat-title" className="truncate text-base font-semibold">
            {channel.title || channel.ownerRoleLabel}
          </h2>
          <p className="text-ink-3 truncate text-xs">
            {channel.leader
              ? t("leaderLine", { name: channel.leader.fullName, username: channel.leader.username })
              : null}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-2 px-4 pt-3 md:px-5">
        {channel.leader ? null : (
          <Banner icon={UserX}>
            <span className="text-ink block font-semibold">{t("noLeaderTitle")}</span>
            {t("noLeaderText")}
          </Banner>
        )}
        <p className="text-2xs text-ink-3 flex items-start gap-1.5">
          <Info aria-hidden className="mt-px size-3 shrink-0" />
          {t("accessNote")}
        </p>
      </div>

      {notFound ? (
        <StateBlock icon={SearchX} title={t("notFoundTitle")} description={t("notFoundDescription")} />
      ) : (
        <QueryState query={query} skeleton={<ListSkeleton rows={5} className="px-5 py-4" />}>
          {(data) => (
            <MessageList
              channel={channel}
              messages={flattenMessages(data)}
              hasOlder={query.hasNextPage}
              loadingOlder={query.isFetchingNextPage}
              onLoadOlder={() => void query.fetchNextPage()}
              onReply={canAct ? setReplyTo : null}
            />
          )}
        </QueryState>
      )}

      {canAct && !notFound ? (
        <Composer
          key={channel.id}
          channelId={channel.id}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      ) : !canAct ? (
        <p className="text-ink-3 border-t px-4 py-3 text-xs md:px-5">{tComposer("viewerNote")}</p>
      ) : null}
    </section>
  );
};

type MessageListProps = {
  channel: Channel;
  messages: ChatMessage[];
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onReply: ((message: ChatMessage) => void) | null;
};

const MessageList = ({
  channel,
  messages,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  onReply,
}: MessageListProps) => {
  const t = useTranslations("chats.conversation");
  const scroller = useRef<HTMLDivElement>(null);
  const newest = messages.at(-1);
  useReadReceipt(channel, newest);

  // eng yangi xabar o'zgarsa (kanal ochildi, yangi xabar keldi) — pastga; eskilar yuklansa — joyida
  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [channel.id, newest?.id]);

  if (messages.length === 0)
    return <StateBlock icon={MessagesSquare} title={t("emptyTitle")} description={t("emptyDescription")} />;

  return (
    <div ref={scroller} className="max-h-140 min-h-80 flex-1 overflow-y-auto px-4 py-3 md:px-5">
      <div className="mb-3 flex justify-center">
        {hasOlder ? (
          <Button size="sm" onClick={onLoadOlder} disabled={loadingOlder} aria-busy={loadingOlder}>
            {loadingOlder ? t("loadingOlder") : t("loadOlder")}
          </Button>
        ) : (
          <span className="text-2xs text-ink-3">{t("start")}</span>
        )}
      </div>
      <ol className="flex flex-col gap-3" aria-live="polite">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} onReply={onReply} />
        ))}
      </ol>
    </div>
  );
};

/**
 * Kanal ochilganda va rahbardan yangi xabar kelganda — `read/` (eng oxirgi id bilan). Bir id ga
 * bir marta; o'zim yozgan xabar o'qilmaganlarni oshirmaydi, shuning uchun u uchun so'rov yo'q.
 */
const useReadReceipt = (channel: Channel, newest: ChatMessage | undefined) => {
  const markRead = useMarkRead();
  const marked = useRef(new Map<number, number>());
  const { mutate } = markRead;
  useEffect(() => {
    if (newest === undefined) return;
    if ((marked.current.get(channel.id) ?? 0) >= newest.id) return;
    if (newest.isMine && channel.unreadCount === 0) return;
    marked.current.set(channel.id, newest.id);
    mutate({ channelId: channel.id, lastMessageId: newest.id });
  }, [channel.id, channel.unreadCount, newest, mutate]);
};
