/** Sessiya cookie nomlari. Qiymatlari httpOnly — brauzer JS ularni o'qiy olmaydi. */
export const ACCESS_COOKIE = "da_owner_access";
export const REFRESH_COOKIE = "da_owner_refresh";

export const ACCESS_MAX_AGE_SECONDS = 15 * 60;
export const REFRESH_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;
/** Telegram (PIN) sessiyasi qisqaroq: telefon qo'ldan-qo'lga o'tishi mumkin. */
export const TELEGRAM_REFRESH_MAX_AGE_SECONDS = 12 * 60 * 60;

/**
 * Sessiya qayerdan ochilgani. Sir emas (httpOnly emas): klient shunga qarab
 * qayta kirishni `/login` ga emas, `/tg` (PIN) ga yuboradi.
 */
export const CHANNEL_COOKIE = "da_owner_channel";
export const TELEGRAM_CHANNEL = "tg";
export type SessionChannel = "web" | "telegram";
