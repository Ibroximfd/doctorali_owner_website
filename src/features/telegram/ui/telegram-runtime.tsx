"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import { routes } from "@/shared/config/routes";
import { useIdleTimeout } from "@/shared/hooks/use-idle-timeout";
import { useIsTelegramChannel } from "@/shared/hooks/use-telegram-channel";
import { useTelegramWebApp } from "@/shared/hooks/use-telegram-web-app";
import { syncTelegramColors, type TelegramWebApp } from "@/shared/lib/telegram";

import { LOCK_AFTER_BACKGROUND_MS, TELEGRAM_IDLE_LOCK_MS } from "../model/telegram.rules";

type TelegramRuntimeProps = {
  /** Qulflash: sessiya yopiladi va PIN ekraniga qaytiladi. */
  onLock: () => void;
};

/**
 * Panel Telegram sessiyasida ochilganda: Telegram mavzusi va ranglari, tizim
 * «orqaga» tugmasi, fonda uzoq qolsa yoki harakatsizlikda — qulflash.
 * Oddiy saytda hech narsa qilmaydi va SDK ni yuklamaydi.
 */
export const TelegramRuntime = ({ onLock }: TelegramRuntimeProps) =>
  useIsTelegramChannel() ? <ActiveRuntime onLock={onLock} /> : null;

const ActiveRuntime = ({ onLock }: TelegramRuntimeProps) => {
  const sdk = useTelegramWebApp();
  const onLockRef = useRef(onLock);

  useEffect(() => {
    onLockRef.current = onLock;
  }, [onLock]);

  useIdleTimeout(() => onLockRef.current(), TELEGRAM_IDLE_LOCK_MS);

  return sdk.status === "ready" ? <WebAppBridge webApp={sdk.webApp} onLockRef={onLockRef} /> : null;
};

type WebAppBridgeProps = { webApp: TelegramWebApp; onLockRef: { current: () => void } };

const WebAppBridge = ({ webApp, onLockRef }: WebAppBridgeProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    webApp.ready();
    webApp.expand();
    // Ro'yxatni pastga surganda mini app tasodifan yopilmasin.
    if (webApp.isVersionAtLeast("7.7")) webApp.disableVerticalSwipes?.();

    setTheme(webApp.colorScheme);
    const onThemeChanged = () => setTheme(webApp.colorScheme);
    webApp.onEvent("themeChanged", onThemeChanged);
    return () => webApp.offEvent("themeChanged", onThemeChanged);
  }, [webApp, setTheme]);

  useEffect(() => {
    syncTelegramColors(webApp);
  }, [webApp, resolvedTheme]);

  useEffect(() => {
    if (pathname === routes.overview) {
      webApp.BackButton.hide();
      return;
    }
    const goBack = () => router.back();
    webApp.BackButton.show();
    webApp.BackButton.onClick(goBack);
    return () => webApp.BackButton.offClick(goBack);
  }, [webApp, pathname, router]);

  useEffect(() => {
    let hiddenAt: number | null = null;
    const onHide = () => {
      hiddenAt ??= Date.now();
    };
    const onShow = () => {
      if (hiddenAt !== null && Date.now() - hiddenAt > LOCK_AFTER_BACKGROUND_MS) onLockRef.current();
      hiddenAt = null;
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? onHide() : onShow());

    document.addEventListener("visibilitychange", onVisibility);
    webApp.onEvent("deactivated", onHide);
    webApp.onEvent("activated", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      webApp.offEvent("deactivated", onHide);
      webApp.offEvent("activated", onShow);
    };
  }, [webApp, onLockRef]);

  return null;
};
