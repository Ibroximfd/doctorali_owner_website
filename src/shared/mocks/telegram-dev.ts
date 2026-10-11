/**
 * Namuna rejimida sahifa oddiy brauzerda (Telegramsiz) ochilsa ishlatiladigan
 * `initData`. Imzosi soxta: `TELEGRAM_BOT_TOKEN` berilgan bo'lsa server uni rad
 * etadi — u holda sahifa faqat Telegram ichida ishlaydi.
 */
const user = JSON.stringify({ id: 100000001, first_name: "Boshliq", language_code: "uz" });

export const MOCK_INIT_DATA = new URLSearchParams({
  user,
  auth_date: "1790000000",
  hash: "0".repeat(64),
}).toString();
