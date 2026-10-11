import { MESSAGE_NAMESPACES, type Locale } from "./locales";

type Messages = Record<string, unknown>;

/** Barcha nomlar fazolarini bitta obyektga yig'adi: `{ common: {...}, nav: {...}, … }`. */
export const loadMessages = async (locale: Locale): Promise<Messages> => {
  const entries = await Promise.all(
    MESSAGE_NAMESPACES.map(async (namespace) => {
      const loaded = (await import(`../../messages/${locale}/${namespace}.json`)) as { default: Messages };
      return [namespace, loaded.default] as const;
    }),
  );
  return Object.fromEntries(entries);
};
