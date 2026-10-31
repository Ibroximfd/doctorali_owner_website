import { mockError, type MockHandler } from "../types";

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

/** `settings` bo'limi namunalari: faol sessiyalar. */
export const settingsHandlers: MockHandler[] = [
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
];
