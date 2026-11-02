import { describe, expect, it } from "vitest";

import { camelize } from "@/shared/lib/camelize";
import { mockGet } from "@/shared/testing/mock-api";

import {
  applyIncoming,
  applyUnread,
  draftProblem,
  groupByFilial,
  imageSrc,
  markReadUpTo,
  mediaHref,
  mergeMessages,
  sendErrorKey,
  TEXT_MAX,
} from "./chats.rules";
import { channelsSchema, messageSchema, messagesPageSchema, type ChatMessage } from "./chats.schema";

const message = (id: number, extra: Record<string, unknown> = {}): ChatMessage =>
  camelize(messageSchema.parse({ id, text: `m${id}`, created_at: "2026-11-01T10:00:00Z", ...extra }));

const channels = () =>
  camelize(
    channelsSchema.parse({
      chats: [
        { id: 12, owner_role: "sales", filial: { id: 1, name: "Toshkent" }, unread: 2 },
        {
          id: 11,
          owner_role: "logistics",
          filial: { id: 1, name: "Toshkent" },
          unread_count: 0,
          leader: null,
        },
        { id: 21, owner_role: "logistics", filial: { id: 2, name: "Qo'qon" } },
      ],
    }),
  );

describe("chats schema", () => {
  it("reads `unread` as `unread_count` and sums the total when it is missing", () => {
    const data = channels();
    expect(data.chats[0]?.unreadCount).toBe(2);
    expect(data.totalUnread).toBe(2);
    expect(data.chats[1]?.leader).toBeNull();
  });

  it("keeps a reference to a missing order and reads loose file shapes", () => {
    const parsed = message(1, {
      ref: { type: "order", id: "9f2b", label: null, exists: false },
      file: { file: "/media/chat/a.png", file_name: "a.png", size: 2048, content_type: "image/png" },
      reply_to: 7,
    });
    expect(parsed.ref).toEqual({ type: "order", id: "9f2b", label: null, exists: false });
    expect(parsed.file).toEqual({
      url: "/media/chat/a.png",
      name: "a.png",
      size: 2048,
      mime: "image/png",
      kind: null,
    });
    expect(parsed.replyTo).toEqual({ id: 7, text: null, senderName: null });
  });

  it("the demo answers match the schemas", () => {
    expect(() => channelsSchema.parse(mockGet("chats/"))).not.toThrow();
    expect(() => messagesPageSchema.parse(mockGet("chats/11/messages/"))).not.toThrow();
  });
});

describe("chats rules", () => {
  it("groups by filial with the chief logist first", () => {
    const groups = groupByFilial(channels().chats);
    expect(groups.map((group) => group.name)).toEqual(["Toshkent", "Qo'qon"]);
    expect(groups[0]?.channels.map((channel) => channel.id)).toEqual([11, 12]);
  });

  it("merges pages without duplicates, oldest first", () => {
    const merged = mergeMessages([message(3), message(1)], [message(2), message(3, { text: "new" })]);
    expect(merged.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(merged[2]?.text).toBe("new");
  });

  it("counts an incoming leader message as unread only when the channel is closed", () => {
    const fromLeader = message(9);
    expect(applyIncoming(channels(), 21, fromLeader, false).totalUnread).toBe(3);
    expect(applyIncoming(channels(), 21, fromLeader, true).totalUnread).toBe(2);
    expect(applyIncoming(channels(), 21, message(10, { is_mine: true }), false).totalUnread).toBe(2);
    expect(applyIncoming(channels(), 21, fromLeader, false).chats[2]?.lastMessage?.text).toBe("m9");
    expect(applyUnread(channels(), 12, 0).totalUnread).toBe(0);
  });

  it("marks only my messages up to the cursor as read", () => {
    const marked = markReadUpTo(
      [message(1, { is_mine: true }), message(2), message(3, { is_mine: true })],
      2,
    );
    expect(marked.map((item) => item.isRead)).toEqual([true, false, false]);
  });

  it("validates a draft before sending", () => {
    const empty = { text: "  ", file: null, ref: null, replyTo: null };
    expect(draftProblem(empty)).toBe("empty");
    expect(draftProblem({ ...empty, text: "x".repeat(TEXT_MAX + 1) })).toBe("tooLong");
    const big = new File(["x"], "a.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
    expect(draftProblem({ ...empty, file: big })).toBe("fileTooLarge");
    expect(draftProblem({ ...empty, text: "salom", ref: { type: "order", id: " " } })).toBe("refId");
    expect(draftProblem({ ...empty, text: "salom" })).toBeNull();
  });

  it("maps error codes and media links", () => {
    expect(sendErrorKey("file_too_large")).toBe("file_too_large");
    expect(sendErrorKey("weird")).toBe("failed");
    expect(mediaHref("/media/a.pdf")).toBe("/api/media/a.pdf");
    expect(mediaHref("javascript:alert(1)")).toBeNull();
    expect(imageSrc("https://imorganic.uz/media/chat/a.png")).toBe("/api/media/chat/a.png");
    expect(imageSrc("https://evil.example/x.png")).toBeNull();
  });
});
