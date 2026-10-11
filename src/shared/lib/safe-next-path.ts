/** Nisbiy yo'lni hal qilish uchun soxta origin — natija shu origin da qolishi shart. */
const BASE = "https://panel.invalid";

/** Boshqaruv belgilari (tab, CR, LF …) — URL tahlilchisi ularni tashlab yuboradi: `/\t/evil.com` → `//evil.com`. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Kirgandan keyin qaytiladigan manzil. Faqat o'z saytimizdagi yo'l qabul
 * qilinadi — `//evil.com`, to'liq URL yoki yashirin belgili hiyla ochiq
 * yo'naltirishga aylanmasin. Qiymat brauzer qanday tushunsa, shunday tekshiriladi.
 */
export const safeNextPath = (next: string | null | undefined): string => {
  if (!next || !next.startsWith("/") || next.includes("\\") || CONTROL_CHARS.test(next)) return "/";
  try {
    const url = new URL(next, BASE);
    return url.origin === BASE ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
};
