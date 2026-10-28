/**
 * Backend `snake_case` yuboradi, UI `camelCase` bilan ishlaydi. Har endpoint
 * uchun qo'lda mapper yozmaslik uchun kalitlar chegarada bir marta, tip bilan
 * birga aylantiriladi — `ui` hech qachon `delta_pct` ni ko'rmaydi.
 */

type CamelCase<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : S;

export type Camelized<T> = T extends readonly (infer Item)[]
  ? Camelized<Item>[]
  : T extends object
    ? { [Key in keyof T as Key extends string ? CamelCase<Key> : Key]: Camelized<T[Key]> }
    : T;

export const camelKey = (key: string): string =>
  key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const convert = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(convert);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [camelKey(key), convert(inner)]));
};

export const camelize = <T>(value: T): Camelized<T> =>
  // `convert` kalitlarni aynan `Camelized<T>` tasvirlagandek o'zgartiradi; buni
  // kompilyator rekursiv mapped type orqali o'zi isbotlay olmaydi.
  convert(value) as Camelized<T>;
