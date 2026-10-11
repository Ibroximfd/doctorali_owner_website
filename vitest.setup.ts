import "@testing-library/jest-dom/vitest";

import { transferableAbortController } from "node:util";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

/* jsdom da yo'q brauzer API lari (Recharts, Radix, next-themes ularga tayanadi). */
if (typeof window !== "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;

  // jsdom o'z AbortController'ini qo'yadi, Node'ning `fetch`/`Request` esa faqat
  // o'zinikini qabul qiladi (ky har so'rovda signal yaratadi) — Node'nikini qaytaramiz.
  const nativeController = transferableAbortController();
  globalThis.AbortController = nativeController.constructor as typeof AbortController;
  globalThis.AbortSignal = nativeController.signal.constructor as typeof AbortSignal;

  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
}
