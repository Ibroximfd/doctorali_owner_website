import type { LiveEvent } from "./live-channel";

/**
 * Jonli kanal hodisalarini bo'limlarga tarqatuvchi kichik shina: kanal bitta (`/ws/owner/`),
 * eshituvchilar — bo'lim hooklari (masalan, chat keshini faqat o'zi yangilaydi). Feature
 * `shared` ga bog'lanadi, aksincha emas.
 */
type Listener = (event: LiveEvent) => void;

const listeners = new Set<Listener>();

export const subscribeLive = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const publishLive = (event: LiveEvent): void => {
  for (const listener of listeners) listener(event);
};
