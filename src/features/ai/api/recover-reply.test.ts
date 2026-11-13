import { describe, expect, it, vi } from "vitest";

import { findReply, lastMessageId } from "../model/ai.rules";
import type { AiMessage, AiMessagesPage } from "../model/ai.schema";
import { RECOVERY_POLL_MS, RECOVERY_WINDOW_MS, recoverReply } from "./ai.api";

const msg = (id: number, role: "user" | "assistant", text: string): AiMessage => ({
  id,
  role,
  text,
  lang: "uz",
  model: null,
  toolsUsed: [],
  createdAt: null,
  attachments: [],
});

const page = (messages: AiMessage[]): AiMessagesPage => ({
  chat: null,
  hasMore: false,
  oldestId: null,
  messages,
  aiAvailable: true,
});

const QUESTION = "Bugunlik hisobot kerak qoqon fliali bo'yicha";

describe("findReply (hujjat 56)", () => {
  it("finds the saved answer to the question sent after the last known message", () => {
    const history = [
      msg(1, "user", "eski"),
      msg(2, "assistant", "eski javob"),
      msg(3, "user", QUESTION),
      msg(4, "assistant", "## Hisobot"),
    ];
    expect(findReply(history, { afterId: 2, question: QUESTION })).toEqual({
      kind: "answered",
      reply: history[3],
    });
  });

  it("tells a saved-but-unanswered question from a missing one", () => {
    expect(
      findReply([msg(1, "assistant", "eski"), msg(3, "user", QUESTION)], { afterId: 1, question: QUESTION }),
    ).toEqual({
      kind: "asked",
    });
    expect(
      findReply([msg(1, "user", QUESTION), msg(2, "assistant", "eski")], { afterId: 2, question: QUESTION }),
    ).toEqual({
      kind: "missing",
    });
  });

  it("works for a brand-new chat", () => {
    expect(
      findReply([msg(7, "user", QUESTION), msg(8, "assistant", "javob")], {
        afterId: null,
        question: QUESTION,
      }).kind,
    ).toBe("answered");
    expect(lastMessageId([])).toBeNull();
    expect(lastMessageId([msg(4, "user", "a"), msg(9, "assistant", "b")])).toBe(9);
  });
});

describe("recoverReply", () => {
  it("returns the answer the backend saved while the request timed out — no resend", async () => {
    const reply = msg(4, "assistant", "javob");
    const load = vi.fn().mockResolvedValue(page([msg(3, "user", QUESTION), reply]));
    const found = await recoverReply(
      { chatId: 3, afterId: 2, question: QUESTION, startedAt: 0 },
      { load, sleep: vi.fn(), now: () => 125_000 },
    );
    expect(found).toEqual(reply);
    expect(load).toHaveBeenCalledOnce();
  });

  it("keeps checking inside the window until the answer appears", async () => {
    let clock = 9_000;
    const load = vi
      .fn()
      .mockResolvedValueOnce(page([]))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(page([msg(3, "user", QUESTION), msg(4, "assistant", "javob")]));
    const sleep = vi.fn(async (ms: number) => {
      clock += ms;
    });
    const found = await recoverReply(
      { chatId: 3, afterId: 2, question: QUESTION, startedAt: 0 },
      { load, sleep, now: () => clock },
    );
    expect(found?.id).toBe(4);
    expect(load).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(RECOVERY_POLL_MS);
  });

  it("gives up after the backend's 90 s guarantee — only then is a resend offered", async () => {
    let clock = 9_000;
    const load = vi.fn().mockResolvedValue(page([msg(1, "user", "eski")]));
    const found = await recoverReply(
      { chatId: 3, afterId: 1, question: QUESTION, startedAt: 0 },
      { load, sleep: async (ms) => void (clock += ms), now: () => clock },
    );
    expect(found).toBeNull();
    expect(clock).toBeLessThanOrEqual(RECOVERY_WINDOW_MS);
  });
});
