"use client";

import { MessagesSquare } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { Card } from "@/shared/ui/card";
import { ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useChannelsQuery, useChatLive, useSelectedChannel } from "../hooks/use-chats";
import { ChannelList } from "./channel-list";
import { Conversation } from "./conversation";

/**
 * «Chatlar» (TZ 32 §C-1): chapda filiallar bo'yicha B.L / B.O kanallari, o'ngda tanlangan
 * suhbat. Telefonda ro'yxat va suhbat almashadi (tanlangan kanal URL da — `?channel=`).
 */
export const ChatsScreen = () => {
  const t = useTranslations("chats");
  const query = useChannelsQuery();
  const [selectedId, setSelected] = useSelectedChannel();
  useChatLive(selectedId);

  return (
    <QueryState
      query={query}
      skeleton={<ListSkeleton rows={6} />}
      isEmpty={(data) => data.chats.length === 0}
      empty={
        <StateBlock
          icon={MessagesSquare}
          title={t("list.emptyTitle")}
          description={t("list.emptyDescription")}
        />
      }
    >
      {(data) => {
        const selected = data.chats.find((chat) => chat.id === selectedId) ?? null;
        return (
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className={cn("p-3 lg:col-span-4", selected && "hidden lg:flex")}>
              <p className="text-ink-2 mb-2 px-2 text-xs" aria-live="polite">
                {t("list.totalUnread", { count: formatNumber(data.totalUnread) })}
              </p>
              <ChannelList
                channels={data.chats}
                selectedId={selectedId}
                onSelect={(id) => void setSelected(id)}
              />
            </Card>
            <Card className={cn("lg:col-span-8", !selected && "hidden lg:flex")}>
              {selected ? (
                <Conversation key={selected.id} channel={selected} onBack={() => void setSelected(null)} />
              ) : (
                <StateBlock
                  icon={MessagesSquare}
                  title={t("conversation.pickTitle")}
                  description={t("conversation.pickDescription")}
                />
              )}
            </Card>
          </div>
        );
      }}
    </QueryState>
  );
};
