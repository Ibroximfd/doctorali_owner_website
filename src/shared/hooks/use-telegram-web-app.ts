"use client";

import { useEffect, useState } from "react";

import { loadTelegramSdk, type TelegramWebApp } from "@/shared/lib/telegram";

export type TelegramSdkState =
  { status: "loading" } | { status: "ready"; webApp: TelegramWebApp } | { status: "absent" };

/** Telegram SDK ni yuklaydi. `absent` — sahifa Telegram ichida emas (yoki skript yuklanmadi). */
export const useTelegramWebApp = (enabled = true): TelegramSdkState => {
  const [state, setState] = useState<TelegramSdkState>({ status: "loading" });

  useEffect(() => {
    if (!enabled) return;
    let isActive = true;
    void loadTelegramSdk().then((webApp) => {
      if (isActive) setState(webApp ? { status: "ready", webApp } : { status: "absent" });
    });
    return () => {
      isActive = false;
    };
  }, [enabled]);

  return state;
};
