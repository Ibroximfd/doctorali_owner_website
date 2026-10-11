"use client";

import { useSyncExternalStore } from "react";

import { isTelegramChannel } from "@/shared/lib/channel";

const subscribe = (): (() => void) => () => {};

/** Panel Telegram sessiyasida ochilganmi (serverda va birinchi chizishda — yo'q). */
export const useIsTelegramChannel = (): boolean =>
  useSyncExternalStore(subscribe, isTelegramChannel, () => false);
