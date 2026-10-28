import "@testing-library/jest-dom/vitest";

import { transferableAbortController } from "node:util";

import { cleanup, configure } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach } from "vitest";

import { resetMissingEndpoints } from "@/shared/lib/http";

afterEach(() => {
  cleanup();
  resetMissingEndpoints();
});

// To'liq yuklamada (70+ ekran testi parallel) `findBy*` uchun 1 s kam — 3 s gacha kutiladi.
configure({ asyncUtilTimeout: 3000 });

// Animatsiyalar testda darhol tugaydi — raqamlar va bloklar oxirgi holatida tekshiriladi.
MotionGlobalConfig.skipAnimations = true;

/* jsdom da yo'q brauzer API lari (Recharts, Radix, next-themes ularga tayanadi). */
if (typeof window !== "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

  // `motion` ning `whileInView` i shunga tayanadi: testda element darhol ko'rinadi deb olinadi.
  class IntersectionObserverStub {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  window.IntersectionObserver ??= IntersectionObserverStub as unknown as typeof IntersectionObserver;

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

  // Endi jsdom `addEventListener({ signal })` da Node signalini rad etadi (`motion` hover/press shunday
  // obuna bo'ladi) — signalni o'zimiz kuzatib, tinglovchini qo'lda olib tashlaymiz.
  const withoutSignal = (nativeAdd: EventTarget["addEventListener"]): EventTarget["addEventListener"] =>
    function (this: EventTarget, type, listener, options) {
      if (typeof options !== "object" || options === null || !options.signal) {
        return nativeAdd.call(this, type, listener, options);
      }
      const { signal, ...rest } = options;
      if (signal.aborted) return;
      nativeAdd.call(this, type, listener, rest);
      signal.addEventListener("abort", () => this.removeEventListener(type, listener, rest), { once: true });
    };
  EventTarget.prototype.addEventListener = withoutSignal(EventTarget.prototype.addEventListener);
  // vitest `window` ga o'z `addEventListener` ini qo'yadi — uni ham o'raymiz.
  window.addEventListener = withoutSignal(window.addEventListener.bind(window));

  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
}
