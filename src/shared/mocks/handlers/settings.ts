import { MOCK_FILIALS } from "../engine";
import { mockError, type MockHandler } from "../types";

const MLN = 1_000_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/* ---------- oylik reja (`02_BACKEND_TZ` §7) ---------- */

const TARGET_CHANNELS = ["total", "delivery", "clinic", "consultation"] as const;
type TargetChannel = (typeof TARGET_CHANNELS)[number];
type TargetItem = { filial: number | null; channel: TargetChannel; amount: number };

/** Sukut reja. Yig'indisi `sample.plan.target` ga teng (2,6 mlrd) — "Umumiy" dagi reja chizig'i bilan mos. */
const DEFAULT_TARGETS: readonly TargetItem[] = [
  { filial: 1, channel: "delivery", amount: 1100 * MLN },
  { filial: 1, channel: "clinic", amount: 340 * MLN },
  { filial: 2, channel: "delivery", amount: 480 * MLN },
  { filial: 2, channel: "clinic", amount: 190 * MLN },
  { filial: 3, channel: "delivery", amount: 420 * MLN },
  { filial: null, channel: "consultation", amount: 70 * MLN },
];

/** Saqlangan rejalar (oy → yozuvlar) — server jarayoni xotirasida, namuna rejimi uchun yetarli. */
const savedTargets = new Map<string, TargetItem[]>();

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const isChannel = (value: unknown): value is TargetChannel =>
  TARGET_CHANNELS.some((channel) => channel === value);

const isKnownFilial = (id: number): boolean => MOCK_FILIALS.some((filial) => filial.id === id);

/** Tana yaroqli bo'lsa yozuvlar, aks holda xato kodi (`validation_error` yoki `filial_not_found`). */
const parseTargetItems = (items: unknown): TargetItem[] | string => {
  if (!Array.isArray(items)) return "validation_error";

  const parsed: TargetItem[] = [];
  for (const item of items) {
    if (!isRecord(item)) return "validation_error";
    const { filial, channel, amount } = item;
    if (!isChannel(channel)) return "validation_error";
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 0) return "validation_error";
    if (filial !== null && typeof filial !== "number") return "validation_error";
    if (typeof filial === "number" && !isKnownFilial(filial)) return "filial_not_found";
    parsed.push({ filial, channel, amount });
  }
  return parsed;
};

/* ---------- faol sessiyalar (§1.2) ---------- */

type SessionSeed = {
  id: string;
  device: string;
  browser: string;
  location: string;
  minutesAgo: number;
  isCurrent: boolean;
};

const SESSION_SEEDS: readonly SessionSeed[] = [
  {
    id: "s-iphone",
    device: "iPhone 15",
    browser: "Safari",
    location: "Toshkent",
    minutesAgo: 0,
    isCurrent: true,
  },
  {
    id: "s-macbook",
    device: "MacBook",
    browser: "Chrome",
    location: "Toshkent",
    minutesAgo: 1011,
    isCurrent: false,
  },
];

/** Uzilgan sessiyalar — server jarayoni xotirasida. */
const revokedSessions = new Set<string>();

const toSession = (seed: SessionSeed, now: Date) => ({
  id: seed.id,
  device: seed.device,
  browser: seed.browser,
  location: seed.location,
  last_seen_at: new Date(now.getTime() - seed.minutesAgo * 60_000).toISOString(),
  is_current: seed.isCurrent,
});

/* ---------- kirish huquqlari ---------- */

/** Shakl `me/` dagi foydalanuvchi bilan bir xil; bo'sh `sections` / `filials` — cheklov yo'q. */
const ACCESS_USERS = [
  { id: 1, full_name: "Boshliq", role: "owner", sections: [], filials: [], mask_pii: false },
  {
    id: 2,
    full_name: "Bosh hisobchi",
    role: "owner_viewer",
    sections: ["finance", "reports"],
    filials: [],
    mask_pii: true,
  },
  {
    id: 3,
    full_name: "O'rinbosar",
    role: "owner_viewer",
    sections: ["orders", "logistics", "sales"],
    filials: [1],
    mask_pii: true,
  },
] as const;

/** `settings` bo'limi namunalari: reja, sessiyalar, kirish huquqlari. */
export const settingsHandlers: MockHandler[] = [
  {
    method: "GET",
    path: "targets/",
    resolve: (ctx) => {
      const month = ctx.searchParams.get("month") ?? ctx.today.slice(0, 7);
      if (!MONTH.test(month)) return mockError(400, "validation_error", "month must be YYYY-MM");
      return { month, items: savedTargets.get(month) ?? DEFAULT_TARGETS };
    },
  },
  {
    method: "PUT",
    path: "targets/",
    resolve: (ctx) => {
      if (!isRecord(ctx.body)) return mockError(400, "validation_error");
      const { month, items } = ctx.body;
      if (typeof month !== "string" || !MONTH.test(month))
        return mockError(400, "validation_error", "month must be YYYY-MM");

      const parsed = parseTargetItems(items);
      if (typeof parsed === "string") return mockError(400, parsed);

      savedTargets.set(month, parsed);
      return { month, items: parsed };
    },
  },
  {
    method: "GET",
    path: "sessions/",
    resolve: (ctx) => ({
      results: SESSION_SEEDS.filter((seed) => !revokedSessions.has(seed.id)).map((seed) =>
        toSession(seed, ctx.now),
      ),
    }),
  },
  {
    method: "DELETE",
    path: "sessions/:id/",
    resolve: (ctx) => {
      const seed = SESSION_SEEDS.find((item) => item.id === ctx.params.id && !revokedSessions.has(item.id));
      if (!seed) return mockError(404, "session_not_found");
      // Joriy qurilma bu yerdan uzilmaydi — buning uchun "Chiqish" bor.
      if (seed.isCurrent) return mockError(400, "session_is_current");

      revokedSessions.add(seed.id);
      // Backend `204` qaytaradi; namuna rejimida BFF tanasiz javob bera olmaydi, shuning uchun `200` + id.
      return { id: seed.id };
    },
  },
  { method: "GET", path: "settings/access/", resolve: () => ({ results: ACCESS_USERS }) },
];
