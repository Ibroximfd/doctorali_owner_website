import { describe, expect, it } from "vitest";

import { resolveBackend } from "./backend-server";

describe("resolveBackend", () => {
  it("sozlanmasa `config/servers.mjs` dagi default serverni oladi", () => {
    expect(resolveBackend()).toEqual({
      name: "prod",
      label: "Production",
      origin: "https://my.imorganic.uz",
    });
  });

  it("nomlangan server bilan almashtiriladi", () => {
    expect(resolveBackend({ server: "test" }).origin).toBe("https://imorganic.uz");
    expect(resolveBackend({ server: "prod" }).origin).toBe("https://my.imorganic.uz");
  });

  it("BACKEND_ORIGIN ustun turadi va oxiridagi / kesiladi", () => {
    expect(resolveBackend({ origin: "http://127.0.0.1:8000/", server: "test" })).toEqual({
      name: "custom",
      label: "Boshqa manzil",
      origin: "http://127.0.0.1:8000",
    });
  });

  it("noto'g'ri nom jim qolmaydi — mavjudlarini aytadi", () => {
    expect(() => resolveBackend({ server: "staging" })).toThrow(/Noma'lum server: "staging"/);
  });
});
