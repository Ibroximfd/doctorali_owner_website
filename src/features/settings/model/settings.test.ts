import { describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { metaSchema } from "@/shared/meta/meta.schema";
import { sample } from "@/shared/mocks/sample";
import { TEST_NOW, mockGet, mockSend } from "@/shared/testing/mock-api";

import {
  currentMonth,
  filialNames,
  fromMillions,
  isKnownRole,
  isSectionKey,
  parseAmount,
  preservedItems,
  sessionLabel,
  targetTotals,
  toTargetRows,
  toTargetsInput,
} from "./settings.rules";
import {
  accessResponseSchema,
  sessionsResponseSchema,
  targetsFormSchema,
  targetsSchema,
  type Targets,
} from "./settings.schema";

const MLN = 1_000_000;
const MONTH = "2026-10";

const targetsFor = (month: string) => parseJson(targetsSchema, mockGet("targets/", { month }));
const sessions = () => parseJson(sessionsResponseSchema, mockGet("sessions/")).results;
const filials = parseJson(metaSchema, mockGet("meta/")).filials;

describe("targets contract", () => {
  it("returns the requested month in the contract shape", () => {
    const targets = targetsFor(MONTH);

    expect(targets.month).toBe(MONTH);
    expect(targets.items.length).toBeGreaterThan(0);
  });

  it("defaults to the current Tashkent month and rejects a malformed one", () => {
    expect(parseJson(targetsSchema, mockGet("targets/")).month).toBe(currentMonth(TEST_NOW));
    expect(() => mockGet("targets/", { month: "october" })).toThrow(/validation_error/);
  });

  it("the default plan adds up to the plan shown on the overview", () => {
    const total = targetsFor(MONTH).items.reduce((sum, item) => sum + item.amount, 0);

    expect(total).toBe(sample.plan.target);
  });

  it("a saved plan is what the next read returns, and only for that month", () => {
    const items = [
      { filial: 1, channel: "delivery", amount: 900 * MLN },
      { filial: null, channel: "consultation", amount: 80 * MLN },
    ];

    const response = mockSend("PUT", "targets/", { month: "2026-11", items });

    expect(response.status).toBe(200);
    expect(parseJson(targetsSchema, response.json)).toEqual({ month: "2026-11", items });
    expect(targetsFor("2026-11").items).toEqual(items);
    expect(targetsFor(MONTH).items).not.toEqual(items);
  });

  it.each([
    ["a body that is not an object", "nonsense", "validation_error"],
    ["a malformed month", { month: "2026-13", items: [] }, "validation_error"],
    [
      "a negative amount",
      { month: MONTH, items: [{ filial: 1, channel: "delivery", amount: -1 }] },
      "validation_error",
    ],
    [
      "a fractional amount of so'm",
      { month: MONTH, items: [{ filial: 1, channel: "delivery", amount: 10.5 }] },
      "validation_error",
    ],
    [
      "an unknown channel",
      { month: MONTH, items: [{ filial: 1, channel: "wholesale", amount: 1 }] },
      "validation_error",
    ],
    [
      "an unknown filial",
      { month: MONTH, items: [{ filial: 99, channel: "delivery", amount: 1 }] },
      "filial_not_found",
    ],
  ])("rejects %s and keeps the stored plan", (_case, body, code) => {
    const before = targetsFor(MONTH);

    expect(mockSend("PUT", "targets/", body)).toMatchObject({ status: 400, json: { code } });
    expect(targetsFor(MONTH)).toEqual(before);
  });
});

describe("sessions contract", () => {
  it("lists devices with exactly one marked as the current one", () => {
    expect(sessions().filter((session) => session.isCurrent)).toHaveLength(1);
  });

  it("never revokes the current device or an unknown session", () => {
    const current = sessions().find((session) => session.isCurrent);

    expect(mockSend("DELETE", `sessions/${current?.id}/`)).toMatchObject({
      status: 400,
      json: { code: "session_is_current" },
    });
    expect(mockSend("DELETE", "sessions/nope/")).toMatchObject({
      status: 404,
      json: { code: "session_not_found" },
    });
    expect(sessions().some((session) => session.isCurrent)).toBe(true);
  });

  it("a revoked session disappears and cannot be revoked twice", () => {
    const other = sessions().find((session) => !session.isCurrent);
    if (!other) throw new Error("sample has no second session");

    expect(mockSend("DELETE", `sessions/${other.id}/`).status).toBe(200);
    expect(sessions().map((session) => session.id)).not.toContain(other.id);
    expect(mockSend("DELETE", `sessions/${other.id}/`).status).toBe(404);
  });
});

describe("access contract", () => {
  it("lists the owner without restrictions and viewers with theirs", () => {
    const users = parseJson(accessResponseSchema, mockGet("settings/access/")).results;
    const owner = users.find((user) => user.role === "owner");

    expect(owner).toMatchObject({ sections: [], filials: [], maskPii: false });
    expect(
      users
        .filter((user) => user.role === "owner_viewer")
        .every((user) => user.sections.length > 0 && user.maskPii),
    ).toBe(true);
  });
});

describe("targets form mapping", () => {
  const loaded: Targets = {
    month: MONTH,
    items: [
      { filial: 1, channel: "delivery", amount: 1100 * MLN },
      { filial: 1, channel: "clinic", amount: 340 * MLN },
      { filial: 3, channel: "delivery", amount: 420 * MLN },
      { filial: null, channel: "consultation", amount: 70 * MLN },
    ],
  };
  const rows = toTargetRows(loaded, filials);

  it("shows amounts in millions and has no clinic field for a filial without a clinic", () => {
    expect(rows).toEqual([
      { filialId: 1, name: "Toshkent", delivery: 1100, clinic: 340 },
      { filialId: 2, name: "Qo'qon", delivery: 0, clinic: 0 },
      { filialId: 3, name: "Samarqand", delivery: 420, clinic: null },
    ]);
  });

  it("sends whole so'm back and keeps what the table does not edit", () => {
    const edited = rows.map((row) => (row.filialId === 1 ? { ...row, delivery: 1200.5 } : row));
    const input = toTargetsInput(MONTH, edited, loaded);

    expect(input.month).toBe(MONTH);
    expect(input.items).toContainEqual({ filial: 1, channel: "delivery", amount: 1_200_500_000 });
    expect(input.items).toContainEqual({ filial: null, channel: "consultation", amount: 70 * MLN });
    // Samarqandda klinika yo'q — u uchun yozuv yuborilmaydi
    expect(input.items.filter((item) => item.filial === 3)).toEqual([
      { filial: 3, channel: "delivery", amount: 420 * MLN },
    ]);
    expect(input.items).toHaveLength(6);
  });

  it("totals follow the fields while typing and skip values that are not valid yet", () => {
    const typing = [
      { delivery: 1100, clinic: 340 },
      { delivery: Number.NaN, clinic: -5 },
      { delivery: 420, clinic: null },
    ];

    expect(targetTotals(typing, preservedItems(loaded, rows))).toEqual({
      delivery: 1520 * MLN,
      clinic: 340 * MLN,
      consultation: 70 * MLN,
      total: 1930 * MLN,
    });
  });

  it("does not count an explicit overall target on top of the channel targets", () => {
    const withOverall = [...loaded.items, { filial: null, channel: "total", amount: 2600 * MLN }];

    expect(targetTotals([], withOverall).total).toBe(1930 * MLN);
  });
});

describe("targets form validation", () => {
  const validate = (delivery: number, clinic: number | null = null) =>
    targetsFormSchema.safeParse({ rows: [{ filialId: 1, delivery, clinic }] });
  const messageOf = (result: ReturnType<typeof validate>) =>
    result.success ? null : result.error.issues[0]?.message;

  it("accepts zero and fractions of a million", () => {
    expect(validate(0).success).toBe(true);
    expect(validate(12.5, 340).success).toBe(true);
  });

  it("rejects negative amounts and text that is not a number", () => {
    expect(messageOf(validate(-5))).toBe("amountNegative");
    expect(messageOf(validate(parseAmount("abc")))).toBe("amountInvalid");
    expect(messageOf(validate(parseAmount("")))).toBe("amountInvalid");
  });

  it("reads numbers the way people type them", () => {
    expect(parseAmount("1 100")).toBe(1100);
    expect(parseAmount("12,5")).toBe(12.5);
    expect(parseAmount(" 12.5 ")).toBe(12.5);
    expect(parseAmount("-5")).toBe(-5);
    expect(parseAmount("1e3")).toBeNaN();
    expect(fromMillions(12.5)).toBe(12_500_000);
  });
});

describe("helpers", () => {
  it("the current month follows Tashkent time, not UTC", () => {
    expect(currentMonth(TEST_NOW)).toBe("2026-10");
    // 30-sentabr 20:00 UTC — Toshkentda allaqachon 1-oktabr 01:00
    expect(currentMonth(new Date("2026-09-30T20:00:00Z"))).toBe("2026-10");
  });

  it("names a session by device and browser when the browser is known", () => {
    expect(sessionLabel({ device: "MacBook", browser: "Chrome" })).toBe("MacBook · Chrome");
    expect(sessionLabel({ device: "Android", browser: null })).toBe("Android");
  });

  it("translates only roles and sections it knows", () => {
    expect(isKnownRole("owner_viewer")).toBe(true);
    expect(isKnownRole("auditor")).toBe(false);
    expect(isSectionKey("finance")).toBe(true);
    expect(isSectionKey("login")).toBe(false);
    expect(isSectionKey("toString")).toBe(false);
  });

  it("resolves filial names and keeps an unknown id visible", () => {
    expect(filialNames([1, 9], filials)).toEqual(["Toshkent", "#9"]);
  });
});
