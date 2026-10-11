/**
 * Telegram mini app SDK (`telegram-web-app.js`) ga yupqa, tiplangan kirish.
 * Skript faqat kerak bo'lganda yuklanadi (`/tg` va Telegram sessiyasidagi panel) —
 * oddiy saytda moliyaviy sahifaga begona skript qo'shilmaydi.
 */

type HapticNotification = "error" | "success" | "warning";

export type TelegramWebApp = {
  initData: string;
  platform: string;
  version: string;
  colorScheme: "light" | "dark";
  ready: () => void;
  expand: () => void;
  close: () => void;
  isVersionAtLeast: (version: string) => boolean;
  disableVerticalSwipes?: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  onEvent: (event: string, handler: () => void) => void;
  offEvent: (event: string, handler: () => void) => void;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
  };
  HapticFeedback?: { notificationOccurred: (type: HapticNotification) => void };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const SDK_URL = "https://telegram.org/js/telegram-web-app.js";
/** Tarmoq sekin bo'lsa ham ekran osilib qolmasin: shundan keyin "Telegram emas" deb hisoblanadi. */
const SDK_TIMEOUT_MS = 6000;

/** Skript yuklangan va sahifa haqiqatan Telegram ichida ochilgan bo'lsa (`initData` bor). */
export const currentWebApp = (): TelegramWebApp | null => {
  if (typeof window === "undefined") return null;
  const webApp = window.Telegram?.WebApp;
  return webApp && webApp.initData !== "" ? webApp : null;
};

let loading: Promise<TelegramWebApp | null> | null = null;

export const loadTelegramSdk = (): Promise<TelegramWebApp | null> => {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.Telegram?.WebApp) return Promise.resolve(currentWebApp());

  loading ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve(currentWebApp());
    script.onerror = () => resolve(null);
    window.setTimeout(() => resolve(currentWebApp()), SDK_TIMEOUT_MS);
    document.head.append(script);
  });
  return loading;
};

/** Faqat testlar uchun: keyingi `loadTelegramSdk` qaytadan boshlaydi. */
export const resetTelegramSdkForTests = (): void => {
  loading = null;
};

export const haptic = (type: HapticNotification): void => {
  currentWebApp()?.HapticFeedback?.notificationOccurred(type);
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Telegram sarlavhasi va foni sahifa fonidagi tokenga (`--bg`) moslanadi. */
export const syncTelegramColors = (webApp: TelegramWebApp): void => {
  const background = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (!HEX_COLOR.test(background)) return;
  webApp.setHeaderColor(background);
  webApp.setBackgroundColor(background);
};
