"use client";

import { Paperclip, UserX } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";

import { groupByFilial } from "../model/chats.rules";
import type { Channel } from "../model/chats.schema";

type ChannelListProps = {
  channels: readonly Channel[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

/** Kanallar filial bo'yicha: har filialda B.L va B.O; o'qilmaganlar soni va oxirgi xabar. */
export const ChannelList = ({ channels, selectedId, onSelect }: ChannelListProps) => {
  const t = useTranslations("chats.list");
  return (
    <nav aria-label={t("label")} className="flex flex-col gap-4">
      {groupByFilial(channels).map((group) => (
        <section key={group.key} aria-labelledby={`chats-filial-${group.key}`}>
          <h3 id={`chats-filial-${group.key}`} className="text-ink-3 mb-1.5 px-2 text-xs font-semibold">
            {group.name ?? t("noFilial")}
          </h3>
          <ul className="flex flex-col gap-1">
            {group.channels.map((channel) => (
              <li key={channel.id}>
                <ChannelRow
                  channel={channel}
                  isActive={channel.id === selectedId}
                  onSelect={() => onSelect(channel.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
};

const ChannelRow = ({
  channel,
  isActive,
  onSelect,
}: {
  channel: Channel;
  isActive: boolean;
  onSelect: () => void;
}) => {
  const t = useTranslations("chats.list");
  const format = useFormat();
  const last = channel.lastMessage;
  const preview = last?.text ?? (last ? t("fileMessage") : t("noMessages"));
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
        isActive ? "border-accent/40 bg-accent-soft" : "hover:bg-surface-2 border-transparent",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{channel.ownerRoleLabel || channel.title}</span>
          {channel.lastMessageAt ? (
            <span className="num text-2xs text-ink-3 ml-auto shrink-0">
              {format.dateTime(channel.lastMessageAt)}
            </span>
          ) : null}
        </span>
        <span className="text-ink-2 flex items-center gap-1 truncate text-xs">
          {channel.leader ? (
            channel.leader.fullName
          ) : (
            <>
              <UserX aria-hidden className="text-warn size-3 shrink-0" />
              <span className="text-warn">{t("noLeader")}</span>
            </>
          )}
        </span>
        <span className="text-ink-3 mt-0.5 flex items-center gap-1 truncate text-xs">
          {last && !last.text ? <Paperclip aria-hidden className="size-3 shrink-0" /> : null}
          <span className="truncate">{last?.by ? `${last.by}: ${preview}` : preview}</span>
        </span>
      </span>
      {channel.unreadCount > 0 ? (
        <span
          className="bg-accent text-accent-ink num text-2xs mt-0.5 grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 font-bold"
          aria-label={t("unread", { count: channel.unreadCount })}
        >
          {formatNumber(channel.unreadCount)}
        </span>
      ) : null}
    </button>
  );
};
