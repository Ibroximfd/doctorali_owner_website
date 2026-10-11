/**
 * Pul, son va vaqt formatlari — butun panelda yagona.
 * Pul so'mda, butun son. Vaqt mintaqasi har doim Toshkent.
 */

export type FormatLocale = "uz" | "ru";

export const TIME_ZONE = "Asia/Tashkent";

const NBSP = " ";

const UNITS: Record<
  FormatLocale,
  { billion: string; million: string; hour: string; minute: string; currency: string }
> = {
  uz: { billion: "mlrd", million: "mln", hour: "s", minute: "d", currency: "so'm" },
  ru: { billion: "млрд", million: "млн", hour: "ч", minute: "мин", currency: "сум" },
};

/** Son bo'lmagan qiymat (NaN, Infinity) — xato emas, «ma'lumot yo'q». */
const MISSING = "—";

/** `-0.04` → `0`: yaxlitlanganda `-0,0` bo'lib qolmasin. */
/** Ma'lumot yo'q (`null`) — xato emas, «—» (`API_QOLLANMA` §8). */
type Maybe = number | null | undefined;

const isPresent = (value: Maybe): value is number => typeof value === "number" && Number.isFinite(value);

const noNegativeZero = (value: number): number => (Object.is(value, -0) ? 0 : value);

const INTL_LOCALE: Record<FormatLocale, string> = { uz: "uz-Latn-UZ", ru: "ru-RU" };

/** `3860` → `3 860` (ajratuvchi — uzilmaydigan bo'shliq). */
export const formatNumber = (value: Maybe): string =>
  isPresent(value)
    ? noNegativeZero(Math.round(value))
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
    : MISSING;

/** `4.86` → `4,9` (o'nlik ajratuvchi — vergul). */
export const formatDecimal = (value: Maybe, digits = 1): string => {
  if (!isPresent(value)) return MISSING;
  const rounded = noNegativeZero(Number(value.toFixed(digits)));
  const [whole = "0", fraction] = rounded.toFixed(digits).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return fraction === undefined ? grouped : `${grouped},${fraction}`;
};

/** `12.6` → `12,6%` */
export const formatPercent = (value: Maybe, digits = 1): string =>
  isPresent(value) ? `${formatDecimal(value, digits)}%` : MISSING;

/**
 * Ixcham pul: `2 332 000 000` → `2,33 mlrd`, `486 000 000` → `486 mln`,
 * `18 400 000` → `18,4 mln`, `612 000` → `612 000`. Valyuta belgisi qo'shilmaydi.
 */
export const formatMoneyCompact = (value: Maybe, locale: FormatLocale = "uz"): string => {
  if (!isPresent(value)) return MISSING;
  const unit = UNITS[locale];
  // Avval yaxlitlanadi, keyin birlik tanlanadi: 999,96 mln → «1,00 mlrd», «1000 mln» emas.
  const millions = Math.abs(value) / 1e6;
  if (Number(millions.toFixed(0)) >= 1000) return `${formatDecimal(value / 1e9, 2)}${NBSP}${unit.billion}`;
  if (Number(millions.toFixed(1)) >= 100) return `${formatNumber(value / 1e6)}${NBSP}${unit.million}`;
  if (Number(millions.toFixed(1)) >= 1) return `${formatDecimal(value / 1e6, 1)}${NBSP}${unit.million}`;
  return formatNumber(value);
};

export const currencyLabel = (locale: FormatLocale = "uz"): string => UNITS[locale].currency;

/** `formatMoneyCompact` + valyuta: `18,4 mln so'm`. */
export const formatMoney = (value: Maybe, locale: FormatLocale = "uz"): string =>
  isPresent(value) ? `${formatMoneyCompact(value, locale)}${NBSP}${UNITS[locale].currency}` : MISSING;

/** Daqiqalar → `3 s 40 d` / `50 d` (soat va daqiqa). */
export const formatDuration = (minutes: Maybe, locale: FormatLocale = "uz"): string => {
  if (!isPresent(minutes)) return MISSING;
  const unit = UNITS[locale];
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}${NBSP}${unit.minute}`;
  return rest === 0
    ? `${hours}${NBSP}${unit.hour}`
    : `${hours}${NBSP}${unit.hour} ${rest}${NBSP}${unit.minute}`;
};

const partsOf = (
  iso: string,
  options: Intl.DateTimeFormatOptions,
  locale: FormatLocale,
): Record<string, string> => {
  const parts = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: TIME_ZONE,
    ...options,
  }).formatToParts(new Date(iso));
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

/** ISO → `14:05` (Toshkent vaqti). */
export const formatTime = (iso: string, locale: FormatLocale = "uz"): string => {
  const parts = partsOf(iso, { hour: "2-digit", minute: "2-digit", hour12: false }, locale);
  return `${parts.hour}:${parts.minute}`;
};

/** ISO → `02.10.2026`. */
export const formatDate = (iso: string, locale: FormatLocale = "uz"): string => {
  const parts = partsOf(iso, { day: "2-digit", month: "2-digit", year: "numeric" }, locale);
  return `${parts.day}.${parts.month}.${parts.year}`;
};

/** ISO → `02.10 14:05`. */
export const formatDateTime = (iso: string, locale: FormatLocale = "uz"): string => {
  const parts = partsOf(
    iso,
    { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false },
    locale,
  );
  return `${parts.day}.${parts.month} ${parts.hour}:${parts.minute}`;
};

const MONTHS_SHORT: Record<FormatLocale, readonly string[]> = {
  uz: ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"],
  ru: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
};

export type Granularity = "hour" | "day" | "week" | "month";

/**
 * Grafik o'qi uchun davr yorlig'i: soat → `09:00`, kun/hafta → `03.09`, oy → `Sen`.
 * `label` — backend bergan ISO sana (`2026-09-03`) yoki sana-vaqt.
 */
export const formatBucket = (
  label: string,
  granularity: Granularity,
  locale: FormatLocale = "uz",
): string => {
  if (granularity === "hour") return formatTime(label, locale);
  const [, month = "01", day = "01"] = /^(?:\d{4})-(\d{2})-(\d{2})/.exec(label) ?? [];
  if (granularity === "month") return MONTHS_SHORT[locale][Number(month) - 1] ?? month;
  return `${day}.${month}`;
};

/** ISO → `juma, 2-oktabr, 2026` (hafta kuni bilan to'liq sana). */
export const formatLongDate = (iso: string, locale: FormatLocale = "uz"): string => {
  const text = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** `2026-10` → `Oktabr` (oy nomi, bosh harf bilan). */
export const formatMonth = (yearMonth: string, locale: FormatLocale = "uz"): string => {
  const name = new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: "long", timeZone: "UTC" }).format(
    new Date(`${yearMonth}-01T00:00:00Z`),
  );
  return name.charAt(0).toUpperCase() + name.slice(1);
};

/** Telefon: `+998901234567` → `+998 90 123 45 67`; boshqa shakl o'zgarishsiz qaytadi. */
export const formatPhone = (phone: string): string => {
  const match = /^\+?(998)(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone.replace(/[\s-]/g, ""));
  return match ? `+${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}` : phone;
};

/** Ism → bosh harflar (`Dilnoza Karimova` → `DK`). */
export const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
