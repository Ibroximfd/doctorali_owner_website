/**
 * Telegram mini app PIN qoidalari (`doctor_ali_owner_bot/docs/02_BACKEND_TZ.md` §3).
 * Backend ham aynan shularni tekshiradi; bu yerda — foydalanuvchiga darhol javob
 * berish va namuna rejimi uchun.
 */
export const PIN_LENGTH = 4;
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 15;

const PIN_PATTERN = new RegExp(`^\\d{${PIN_LENGTH}}$`);

export const isPinShaped = (pin: string): boolean => PIN_PATTERN.test(pin);

/** Taxmin qilinadigan kodlar: birinchi bo'lib sinab ko'riladiganlar ro'yxati. */
const COMMON_PINS = new Set(["1004", "2000", "2580", "0852", "6969"]);

const digitsOf = (pin: string): number[] => [...pin].map(Number);

const isSequence = (digits: readonly number[], step: 1 | -1): boolean =>
  digits.every((digit, index) => index === 0 || digit === (digits[index - 1] ?? Number.NaN) + step);

/** `0000`, `1234`, `4321`, `1212` va mashhur kodlar — oddiy (qabul qilinmaydi). */
export const isWeakPin = (pin: string): boolean => {
  if (!isPinShaped(pin)) return true;
  const digits = digitsOf(pin);
  const allSame = new Set(digits).size === 1;
  const repeatedPair = pin.slice(0, 2) === pin.slice(2);
  return allSame || repeatedPair || isSequence(digits, 1) || isSequence(digits, -1) || COMMON_PINS.has(pin);
};
