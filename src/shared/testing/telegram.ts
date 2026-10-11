import { HttpResponse, http } from "msw";
import { vi } from "vitest";

import type { TelegramWebApp } from "@/shared/lib/telegram";
import { resetTelegramSdkForTests } from "@/shared/lib/telegram";
import { resolveMock } from "@/shared/mocks/registry";

/** Telegram SDK o'rnida: chaqiruvlar yoziladi, hodisalarni test o'zi chaqiradi. */
export const installTelegram = (overrides: Partial<TelegramWebApp> = {}) => {
  const listeners = new Map<string, Set<() => void>>();
  const webApp = {
    initData: "",
    platform: "ios",
    version: "8.0",
    colorScheme: "light" as const,
    ready: vi.fn(),
    expand: vi.fn(),
    close: vi.fn(),
    isVersionAtLeast: () => true,
    disableVerticalSwipes: vi.fn(),
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
    onEvent: vi.fn((event: string, handler: () => void) => {
      listeners.set(event, (listeners.get(event) ?? new Set()).add(handler));
    }),
    offEvent: vi.fn((event: string, handler: () => void) => listeners.get(event)?.delete(handler)),
    BackButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(), offClick: vi.fn() },
    HapticFeedback: { notificationOccurred: vi.fn() },
    ...overrides,
  } satisfies TelegramWebApp;

  resetTelegramSdkForTests();
  window.Telegram = { WebApp: webApp };
  return {
    webApp,
    emit: (event: string) => listeners.get(event)?.forEach((handler) => handler()),
  };
};

export const uninstallTelegram = (): void => {
  delete window.Telegram;
  resetTelegramSdkForTests();
};

export const sampleInitData = (telegramId = 555): string =>
  new URLSearchParams({
    user: JSON.stringify({ id: telegramId, first_name: "Boshliq" }),
    auth_date: "1790000000",
    hash: "a".repeat(64),
  }).toString();

const resolveTelegram = (action: string, body: unknown) =>
  resolveMock({
    method: "POST",
    path: `telegram/${action}/`,
    searchParams: new URLSearchParams(),
    body,
    now: new Date(),
  });

/**
 * `/api/auth/telegram/*` — BFF dagidek: `link` muvaffaqiyatli bo'lsa darhol PIN bilan
 * kiriladi, kirish javobidan tokenlar olib tashlanadi (brauzerga faqat foydalanuvchi).
 * Namuna backend hozirgi vaqt bilan ishlaydi — qulf sanog'i haqiqiy soatga bog'liq.
 */
export const telegramAuthHandler = http.post("*/api/auth/telegram/:action", async ({ request, params }) => {
  const action = String(params.action);
  const body = (await request.json()) as Record<string, unknown>;
  let response = resolveTelegram(action, body);
  if (action === "link" && response.status === 200) response = resolveTelegram("login", body);

  const signedIn = (action === "login" || action === "link") && response.status === 200;
  const json = signedIn ? { user: (response.json as { user: unknown }).user } : response.json;
  return HttpResponse.json(json as Record<string, unknown>, { status: response.status });
});
