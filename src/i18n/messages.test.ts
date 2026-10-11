import { describe, expect, it } from "vitest";

import { LOCALES, MESSAGE_NAMESPACES } from "./locales";
import { loadMessages } from "./messages";

/** Barcha kalit yo'llari: `{a:{b:"x"}}` → `["a.b"]`. */
const keyPaths = (value: unknown, prefix = ""): string[] => {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, inner]) => keyPaths(inner, prefix ? `${prefix}.${key}` : key));
};

/** ICU o'zgaruvchilari: `"{count} ta"` → `["count"]`. */
const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)/g)].map((match) => match[1] ?? "").sort();

const valueAt = (messages: unknown, path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        typeof node === "object" && node !== null ? (node as Record<string, unknown>)[key] : undefined,
      messages,
    );

describe("translations", () => {
  it("every locale has every namespace", async () => {
    for (const locale of LOCALES) {
      const messages = await loadMessages(locale);
      expect(Object.keys(messages).sort()).toEqual([...MESSAGE_NAMESPACES].sort());
    }
  });

  it("uz and ru have exactly the same keys", async () => {
    const [uz, ru] = await Promise.all([loadMessages("uz"), loadMessages("ru")]);

    expect(keyPaths(ru).sort()).toEqual(keyPaths(uz).sort());
  });

  it("uz and ru use the same placeholders in every message", async () => {
    const [uz, ru] = await Promise.all([loadMessages("uz"), loadMessages("ru")]);
    const mismatched = keyPaths(uz).filter((path) => {
      const [uzText, ruText] = [valueAt(uz, path), valueAt(ru, path)];
      return (
        typeof uzText === "string" &&
        typeof ruText === "string" &&
        placeholders(uzText).join() !== placeholders(ruText).join()
      );
    });

    expect(mismatched).toEqual([]);
  });

  it("no message is left empty", async () => {
    for (const locale of LOCALES) {
      const messages = await loadMessages(locale);
      const empty = keyPaths(messages).filter((path) => valueAt(messages, path) === "");
      expect(empty).toEqual([]);
    }
  });
});
