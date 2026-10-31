/** Sessiya cookie nomlari. Qiymatlari httpOnly — brauzer JS ularni o'qiy olmaydi. */
export const ACCESS_COOKIE = "da_owner_access";
export const REFRESH_COOKIE = "da_owner_refresh";

export const ACCESS_MAX_AGE_SECONDS = 15 * 60;
export const REFRESH_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

/** Eski Telegram kanali belgisi — chiqishda tozalanadi (mini app olib tashlangan). */
export const CHANNEL_COOKIE = "da_owner_channel";
